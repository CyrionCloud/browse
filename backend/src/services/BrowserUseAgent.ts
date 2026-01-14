import { EventEmitter } from 'events'
import { logger } from '../utils/logger'
import { PythonBridge } from './PythonBridge'
import type {
  BrowserUseAction,
  BrowserUseResult,
  BrowserUseSessionConfig,
  DomTree,
  DomElement,
  ActionResult
} from '@autobrowse/shared'

const DEFAULT_CONFIG: BrowserUseSessionConfig = {
  headless: true,
  viewport: { width: 1280, height: 720 },
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  highlightElements: false
}

export class BrowserUseAgent extends EventEmitter {
  private bridge: PythonBridge
  private config: BrowserUseSessionConfig
  private currentUrl: string = ''

  constructor(config?: Partial<BrowserUseSessionConfig>) {
    super()
    this.config = { ...DEFAULT_CONFIG, ...config }

    this.bridge = new PythonBridge({
      maxProcesses: 1,
      timeout: 300000
    })

    this.bridge.on('process_spawned', (data) => {
      logger.debug('BrowserUse agent process spawned', data)
      this.emit('ready', data)
    })

    this.bridge.on('process_closed', (data) => {
      logger.info('BrowserUse agent process closed', data)
      this.emit('closed', data)
    })

    logger.info('BrowserUseAgent initialized')
  }

  async navigate(url: string): Promise<BrowserUseResult> {
    const startTime = Date.now()

    logger.info('Navigating to URL', { url })

    try {
      await this.bridge.call('browser_use', 'navigate', { url })

      this.currentUrl = url

      const result: BrowserUseResult = {
        success: true,
        action: { type: 'navigate', description: `Navigate to ${url}` },
        duration: Date.now() - startTime
      }

      this.emit('action_executed', result)
      return result
    } catch (error: any) {
      const result: BrowserUseResult = {
        success: false,
        action: { type: 'navigate', description: `Navigate to ${url}` },
        error: error.message || 'Navigation failed',
        duration: Date.now() - startTime
      }

      this.emit('action_failed', result)
      return result
    }
  }

  async action(description: string, params?: { selector?: string; coordinates?: { x: number; y: number }; value?: string }): Promise<BrowserUseResult> {
    const startTime = Date.now()

    logger.info('Executing action', { description, params })

    try {
      const resultData = await this.bridge.call('browser_use', 'action', {
        description,
        ...params
      })

      const result: BrowserUseResult = {
        success: true,
        action: {
          type: 'click',
          description,
          selector: params?.selector,
          coordinates: params?.coordinates,
          value: params?.value
        },
        screenshot: resultData.screenshot,
        duration: Date.now() - startTime
      }

      this.emit('action_executed', result)
      return result
    } catch (error: any) {
      const result: BrowserUseResult = {
        success: false,
        action: {
          type: 'click',
          description,
          selector: params?.selector,
          coordinates: params?.coordinates
        },
        error: error.message || 'Action failed',
        duration: Date.now() - startTime
      }

      this.emit('action_failed', result)
      return result
    }
  }

  async click(selector: string): Promise<BrowserUseResult> {
    return this.action(`Click element`, { selector })
  }

  async type(selector: string, text: string): Promise<BrowserUseResult> {
    return this.action(`Type text`, { selector, value: text })
  }

  async scroll(direction: 'up' | 'down', amount: number = 500): Promise<BrowserUseResult> {
    return this.action(`Scroll ${direction}`, {}, {})
  }

  async extract(selector: string): Promise<BrowserUseResult & { extractedData?: string }> {
    const startTime = Date.now()

    logger.info('Extracting from element', { selector })

    try {
      const data = await this.bridge.call('browser_use', 'extract', { selector })

      const result: BrowserUseResult = {
        success: true,
        action: { type: 'extract', description: `Extract from ${selector}` },
        extractedData: data.text,
        duration: Date.now() - startTime
      }

      this.emit('action_executed', result)
      return result
    } catch (error: any) {
      const result: BrowserUseResult = {
        success: false,
        action: { type: 'extract', description: `Extract from ${selector}` },
        error: error.message || 'Extraction failed',
        duration: Date.now() - startTime
      }

      this.emit('action_failed', result)
      return result
    }
  }

  async screenshot(): Promise<Buffer> {
    const startTime = Date.now()

    logger.info('Taking screenshot')

    try {
      const data = await this.bridge.call('browser_use', 'screenshot')

      const result: BrowserUseResult = {
        success: true,
        action: { type: 'screenshot', description: 'Take screenshot' },
        screenshot: data.screenshot,
        duration: Date.now() - startTime
      }

      this.emit('action_executed', result)

      if (data.screenshot) {
        return Buffer.from(String(data.screenshot), 'base64')
      }

      throw new Error('No screenshot data returned')
    } catch (error: any) {
      const result: BrowserUseResult = {
        success: false,
        action: { type: 'screenshot', description: 'Take screenshot' },
        error: error.message || 'Screenshot failed',
        duration: Date.now() - startTime
      }

      this.emit('action_failed', result)
      throw error
    }
  }

  async getDomTree(): Promise<DomTree> {
    const startTime = Date.now()

    logger.info('Getting DOM tree')

    try {
      const data = await this.bridge.call('browser_use', 'get_dom_tree')

      const domTree: DomTree = {
        url: data.url,
        title: data.title,
        elements: data.elements.map((el: any) => ({
          id: el.id,
          tag: el.tag,
          text: el.text,
          attributes: el.attributes,
          coordinates: el.coordinates,
          boundingBox: el.boundingBox
        }))
      }

      this.emit('dom_tree_received', domTree)
      return domTree
    } catch (error: any) {
      logger.error('Failed to get DOM tree', { error })
      throw error
    }
  }

  async highlightElement(selector: string): Promise<void> {
    const startTime = Date.now()

    logger.info('Highlighting element', { selector })

    try {
      await this.bridge.call('browser_use', 'highlight_element', { selector })

      const result: BrowserUseResult = {
        success: true,
        action: { type: 'highlight', description: `Highlight ${selector}` },
        duration: Date.now() - startTime
      }

      this.emit('action_executed', result)
    } catch (error: any) {
      logger.error('Failed to highlight element', { error })
      throw error
    }
  }

  async waitForElement(selector: string, timeout: number = 10000): Promise<DomElement | null> {
    const startTime = Date.now()

    logger.info('Waiting for element', { selector, timeout })

    try {
      const element = await this.bridge.call('browser_use', 'wait_for_element', {
        selector,
        timeout
      })

      const result: BrowserUseResult = {
        success: true,
        action: { type: 'wait', description: `Wait for ${selector}` },
        duration: Date.now() - startTime
      }

      this.emit('action_executed', result)

      return element ? {
        id: element.id,
        tag: element.tag,
        text: element.text,
        attributes: element.attributes,
        coordinates: element.coordinates,
        boundingBox: element.boundingBox
      } : null
    } catch (error: any) {
      const result: BrowserUseResult = {
        success: false,
        action: { type: 'wait', description: `Wait for ${selector}` },
        error: error.message || 'Wait failed',
        duration: Date.now() - startTime
      }

      this.emit('action_failed', result)
      return null
    }
  }

  async runAgent(task: string, config?: Record<string, any>): Promise<ActionResult[]> {
    const startTime = Date.now()

    logger.info('Running browser-use agent', { task, config })

    try {
      const data = await this.bridge.call('browser_use', 'run_agent', {
        task,
        config: this.config
      })

      const results: ActionResult[] = data.actions_executed || []

      for (const result of results) {
        this.emit('action_executed', result)
      }

      logger.info('Agent completed', { task, actionCount: results.length })

      this.emit('agent_complete', { results, duration: Date.now() - startTime })

      return results
    } catch (error: any) {
      logger.error('Agent failed', { task, error })

      const result: ActionResult = {
        success: false,
        action: 'run_agent',
        error: error.message || 'Agent failed',
        duration: Date.now() - startTime
      }

      this.emit('agent_failed', result)
      throw error
    }
  }

  getCurrentUrl(): string {
    return this.currentUrl
  }

  getConfig(): BrowserUseSessionConfig {
    return { ...this.config }
  }

  updateConfig(config: Partial<BrowserUseSessionConfig>): void {
    this.config = { ...this.config, ...config }
    logger.debug('Config updated', { config: this.config })
  }

  async cleanup(): Promise<void> {
    logger.info('Cleaning up BrowserUseAgent')

    await this.bridge.stopAllProcesses()

    logger.info('BrowserUseAgent cleanup complete')
  }

  isReady(): boolean {
    return this.bridge.getProcessInfo()?.status === 'running'
  }

  getStatus() {
    const bridgeStats = this.bridge.getStats()

    return {
      ready: this.isReady(),
      url: this.currentUrl,
      ...bridgeStats
    }
  }
}
