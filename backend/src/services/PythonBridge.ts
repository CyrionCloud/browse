import { spawn, ChildProcess } from 'child_process'
import { EventEmitter } from 'events'
import { v4 as uuidv4 } from 'uuid'
import { logger } from '../utils/logger'
import type {
  PythonMessage,
  PythonResponse,
  PythonServiceType,
  PythonProcessConfig,
  PythonProcessInfo
} from '@autobrowse/shared'

const DEFAULT_CONFIG: PythonProcessConfig = {
  maxProcesses: 5,
  timeout: 300000,
  maxMemoryMB: 512,
  maxCpuPercent: 80
}

interface PendingRequest {
  resolve: (response: PythonResponse) => void
  reject: (error: Error) => void
  timeout: NodeJS.Timeout
}

export class PythonBridge extends EventEmitter {
  private processes: Map<string, PythonProcessInfo> = new Map()
  private pendingRequests: Map<string, PendingRequest> = new Map()
  private config: PythonProcessConfig
  private bridgePath: string

  constructor(config?: Partial<PythonProcessConfig>) {
    super()
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.bridgePath = `${process.cwd()}/src/integrations/bridge.py`
    logger.info('PythonBridge initialized', { config: this.config })
  }

  async call<T = any>(
    service: PythonServiceType,
    method: string,
    params: Record<string, any> = {},
    options: { sessionId?: string; timeout?: number } = {}
  ): Promise<T> {
    const { sessionId, timeout } = options
    const requestId = uuidv4()

    return new Promise((resolve, reject) => {
      const timeoutMs = timeout || this.config.timeout!

      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(requestId)
        reject(new Error(`Python bridge timeout after ${timeoutMs}ms`))
      }, timeoutMs)

      this.pendingRequests.set(requestId, {
        resolve: resolve as (response: PythonResponse) => void,
        reject,
        timeout: timeoutHandle
      })

      const message: PythonMessage = {
        id: requestId,
        type: service,
        method,
        params,
        sessionId
      }

      this.sendMessage(message).catch((error) => {
        clearTimeout(timeoutHandle)
        this.pendingRequests.delete(requestId)
        reject(error)
      })

      logger.debug('Python bridge request sent', { requestId, service, method })
    })
  }

  private async sendMessage(message: PythonMessage): Promise<void> {
    const processInfo = this.getOrCreateProcess(message.sessionId)

    try {
      const jsonMessage = JSON.stringify(message)
      processInfo.process.stdin!.write(jsonMessage + '\n')
    } catch (error) {
      logger.error('Failed to send message to Python process', { error })
      throw error
    }
  }

  private getOrCreateProcess(sessionId?: string): PythonProcessInfo {
    const processId = sessionId || 'default'

    if (this.processes.has(processId)) {
      const info = this.processes.get(processId)!
      if (info.status === 'running') {
        return info
      }
      this.processes.delete(processId)
    }

    const process = this.spawnPythonProcess()

    const info: PythonProcessInfo = {
      pid: process.pid!,
      status: 'running',
      startTime: new Date(),
      process
    }

    this.processes.set(processId, info)

    process.stdout?.on('data', (data: Buffer) => {
      this.handlePythonResponse(processId, data)
    })

    process.stderr?.on('data', (data: Buffer) => {
      logger.error('Python process stderr', { pid: process.pid, output: data.toString() })
    })

    process.on('close', (code, signal) => {
      logger.info('Python process closed', { pid: process.pid, code, signal })

      const info = this.processes.get(processId)
      if (info) {
        info.status = code === 0 ? 'stopped' : 'crashed'
        this.processes.set(processId, info)
      }

      this.emit('process_closed', { processId, pid: process.pid!, code, signal })
    })

    process.on('error', (error) => {
      logger.error('Python process error', { pid: process.pid, error })
      this.emit('process_error', { processId, pid: process.pid!, error })
    })

    logger.info('Python bridge process spawned', { pid: process.pid, processId })

    this.emit('process_spawned', { processId, pid: process.pid! })

    return info
  }

  private spawnPythonProcess(): ChildProcess {
    try {
      return spawn('python3', [this.bridgePath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          PYTHONUNBUFFERED: '1'
        }
      })
    } catch (error) {
      logger.error('Failed to spawn Python process', { error })
      throw error
    }
  }

  private handlePythonResponse(processId: string, data: Buffer): void {
    const responses = data.toString().split('\n').filter((line: string) => line.trim())

    for (const line of responses) {
      if (!line) continue

      try {
        const response: PythonResponse = JSON.parse(line)
        const pending = this.pendingRequests.get(response.id)

        if (pending) {
          clearTimeout(pending.timeout)
          this.pendingRequests.delete(response.id)

          if (response.success) {
            pending.resolve(response.data)
          } else {
            pending.reject(new Error(response.error || 'Unknown error'))
          }

          logger.debug('Python bridge response received', { requestId: response.id })
        } else {
          logger.warn('Received response for unknown request', { requestId: response.id })
        }
      } catch (error) {
        logger.error('Failed to parse Python response', { error, line })
      }
    }
  }

  async stopProcess(processId: string = 'default'): Promise<void> {
    const info = this.processes.get(processId)
    if (!info || info.status === 'stopped') {
      return
    }

    logger.info('Stopping Python process', { processId, pid: info.pid })

    const message: PythonMessage = {
      id: uuidv4(),
      type: 'browser_use',
      method: 'shutdown',
      params: {}
    }

    try {
      info.process.stdin!.write(JSON.stringify(message) + '\n')
    } catch (error) {
      logger.error('Failed to send shutdown to Python process', { error })
    }

    await this.waitForProcessTermination(info.pid, 5000)

    this.processes.delete(processId)

    logger.info('Python process stopped', { processId })
  }

  private async waitForProcessTermination(pid: number, timeoutMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Process termination timeout'))
      }, timeoutMs)

      const interval = setInterval(() => {
        const info = Array.from(this.processes.values()).find((i) => i.pid === pid)
        if (!info || info.status !== 'running') {
          clearInterval(interval)
          clearTimeout(timeout)
          resolve()
        }
      }, 100)
    })
  }

  async stopAllProcesses(): Promise<void> {
    logger.info('Stopping all Python processes', { count: this.processes.size })

    const stopPromises = Array.from(this.processes.keys()).map((processId) =>
      this.stopProcess(processId)
    )

    await Promise.allSettled(stopPromises)

    logger.info('All Python processes stopped')
  }

  getProcessInfo(processId?: string): PythonProcessInfo | undefined {
    return this.processes.get(processId || 'default')
  }

  getActiveProcessCount(): number {
    return Array.from(this.processes.values()).filter(
      (info) => info.status === 'running'
    ).length
  }

  async restartProcess(processId: string = 'default'): Promise<void> {
    logger.info('Restarting Python process', { processId })
    await this.stopProcess(processId)
    this.getOrCreateProcess(processId)
  }

  async cleanup(): Promise<void> {
    logger.info('Cleaning up Python bridge')

    for (const processId of this.processes.keys()) {
      try {
        await this.stopProcess(processId)
      } catch (error) {
        logger.error('Failed to stop process during cleanup', { processId, error })
      }
    }

    this.pendingRequests.clear()
    this.processes.clear()

    logger.info('Python bridge cleanup complete')
  }

  getStats() {
    return {
      totalProcesses: this.processes.size,
      activeProcesses: this.getActiveProcessCount(),
      pendingRequests: this.pendingRequests.size,
      maxProcesses: this.config.maxProcesses
    }
  }
}

export class PythonBridgePool extends EventEmitter {
  private bridges: Map<string, PythonBridge> = new Map()
  private config: PythonProcessConfig

  constructor(config?: Partial<PythonProcessConfig>) {
    super()
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  getBridge(sessionId?: string): PythonBridge {
    const bridgeId = sessionId || 'default'

    if (!this.bridges.has(bridgeId)) {
      const bridge = new PythonBridge(this.config)
      this.bridges.set(bridgeId, bridge)

      bridge.on('process_spawned', (data) => {
        this.emit('process_spawned', { ...data, bridgeId })
      })

      bridge.on('process_closed', (data) => {
        this.emit('process_closed', { ...data, bridgeId })
      })

      bridge.on('process_error', (data) => {
        this.emit('process_error', { ...data, bridgeId })
      })

      logger.info('Python bridge created for session', { bridgeId })
    }

    return this.bridges.get(bridgeId)!
  }

  async getBridgeForSession(sessionId: string): Promise<PythonBridge> {
    return this.getBridge(sessionId)
  }

  async releaseBridge(sessionId?: string): Promise<void> {
    const bridgeId = sessionId || 'default'
    const bridge = this.bridges.get(bridgeId)

    if (bridge) {
      await bridge.stopProcess(bridgeId)
      this.bridges.delete(bridgeId)

      logger.info('Python bridge released for session', { bridgeId })
    }
  }

  async releaseAllBridges(): Promise<void> {
    logger.info('Releasing all Python bridges')

    const releasePromises = Array.from(this.bridges.keys()).map((bridgeId) =>
      this.releaseBridge(bridgeId)
    )

    await Promise.allSettled(releasePromises)

    this.bridges.clear()

    logger.info('All Python bridges released')
  }

  getPoolStats() {
    return {
      totalBridges: this.bridges.size,
      maxBridges: this.config.maxProcesses
    }
  }
}
