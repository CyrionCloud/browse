import { EventEmitter } from 'events'
import { BrowserService, BrowserConfig } from './BrowserService'
import { AgentService } from './AgentService'
import { logger } from '../utils/logger'
import type { ActionResult, AgentConfig, ActionType } from '@autobrowse/shared'

interface TaskProgress {
  status: 'planning' | 'executing' | 'completed' | 'failed'
  currentStep: number
  totalSteps: number
  currentAction?: string
  error?: string
}

interface ExecuteTaskOptions {
  taskDescription: string
  agentConfig?: Partial<AgentConfig>
  browserConfig?: Partial<BrowserConfig>
  onProgress?: (progress: TaskProgress) => void
  onAction?: (result: ActionResult) => void
}

export class BrowserUseService extends EventEmitter {
  private browserService: BrowserService | null = null
  private agentService: AgentService | null = null
  private isRunning: boolean = false
  private isPaused: boolean = false

  async executeTask(options: ExecuteTaskOptions): Promise<ActionResult[]> {
    const { taskDescription, agentConfig, browserConfig, onProgress, onAction } = options
    const results: ActionResult[] = []

    try {
      this.isRunning = true
      this.isPaused = false

      // Initialize services
      this.browserService = new BrowserService(browserConfig)
      this.agentService = new AgentService(agentConfig)

      await this.browserService.init()

      // Notify planning started
      const emitProgress = (progress: TaskProgress) => {
        this.emit('progress', progress)
        onProgress?.(progress)
      }

      emitProgress({
        status: 'planning',
        currentStep: 0,
        totalSteps: 0,
        currentAction: 'Analyzing task and planning actions...'
      })

      // Plan actions
      const actions = await this.agentService.planBrowserActions(taskDescription)

      logger.info('Task planning complete', { actionCount: actions.length })

      // Execute actions
      for (let i = 0; i < actions.length; i++) {
        if (!this.isRunning) {
          logger.info('Task cancelled')
          break
        }

        while (this.isPaused) {
          await new Promise(resolve => setTimeout(resolve, 100))
          if (!this.isRunning) break
        }

        const action = actions[i]
        const startTime = Date.now()

        emitProgress({
          status: 'executing',
          currentStep: i + 1,
          totalSteps: actions.length,
          currentAction: action.description
        })

        try {
          const result = await this.executeAction(
            action.action as ActionType,
            action.target,
            action.value
          )

          const duration = Date.now() - startTime
          const actionResult: ActionResult = {
            success: true,
            action: action.action,
            target: action.target,
            value: action.value,
            duration
          }

          // Take screenshot after action
          if (this.browserService) {
            try {
              const screenshot = await this.browserService.screenshot()
              actionResult.screenshot = screenshot
            } catch (e) {
              logger.warn('Failed to capture screenshot after action')
            }
          }

          results.push(actionResult)
          this.emit('action', actionResult)
          onAction?.(actionResult)

          logger.debug('Action executed', { action: action.action, duration })
        } catch (error: any) {
          const duration = Date.now() - startTime
          const actionResult: ActionResult = {
            success: false,
            action: action.action,
            target: action.target,
            value: action.value,
            error: error.message,
            duration
          }

          results.push(actionResult)
          this.emit('action', actionResult)
          onAction?.(actionResult)

          logger.error('Action failed', { action: action.action, error: error.message })

          // Continue with next action even if one fails
        }

        // Small delay between actions
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      emitProgress({
        status: 'completed',
        currentStep: actions.length,
        totalSteps: actions.length
      })

      this.emit('complete', results)

      return results
    } catch (error: any) {
      logger.error('Task execution failed', { error: error.message })

      const progress: TaskProgress = {
        status: 'failed',
        currentStep: 0,
        totalSteps: 0,
        error: error.message
      }

      this.emit('progress', progress)
      onProgress?.(progress)
      this.emit('error', error)

      throw error
    } finally {
      await this.cleanup()
    }
  }

  private async executeAction(
    action: ActionType,
    target?: string,
    value?: string
  ): Promise<void> {
    if (!this.browserService) {
      throw new Error('Browser not initialized')
    }

    switch (action) {
      case 'navigate':
        if (!value) throw new Error('URL required for navigate action')
        await this.browserService.navigate(value)
        break

      case 'click':
        if (!target) throw new Error('Selector required for click action')
        await this.browserService.click(target)
        break

      case 'type':
        if (!target) throw new Error('Selector required for type action')
        if (!value) throw new Error('Text required for type action')
        await this.browserService.type(target, value)
        break

      case 'scroll':
        const direction = value === 'up' ? 'up' : 'down'
        await this.browserService.scroll(direction)
        break

      case 'extract':
        if (!target) throw new Error('Selector required for extract action')
        await this.browserService.extract(target)
        break

      case 'wait':
        const ms = value ? parseInt(value, 10) : 1000
        await this.browserService.wait(ms)
        break

      case 'screenshot':
        await this.browserService.screenshot()
        break

      case 'hover':
        if (!target) throw new Error('Selector required for hover action')
        const page = this.browserService.getPage()
        if (page) await page.hover(target)
        break

      case 'select':
        if (!target) throw new Error('Selector required for select action')
        if (!value) throw new Error('Value required for select action')
        const selectPage = this.browserService.getPage()
        if (selectPage) await selectPage.selectOption(target, value)
        break

      default:
        throw new Error(`Unknown action: ${action}`)
    }
  }

  pause(): void {
    this.isPaused = true
    this.emit('paused')
    logger.info('Task paused')
  }

  resume(): void {
    this.isPaused = false
    this.emit('resumed')
    logger.info('Task resumed')
  }

  cancel(): void {
    this.isRunning = false
    this.isPaused = false
    this.emit('cancelled')
    logger.info('Task cancelled')
  }

  private async cleanup(): Promise<void> {
    this.isRunning = false
    this.isPaused = false

    if (this.browserService) {
      try {
        await this.browserService.close()
      } catch (error) {
        logger.error('Error closing browser', { error })
      }
      this.browserService = null
    }

    this.agentService = null
  }

  isTaskRunning(): boolean {
    return this.isRunning
  }

  isTaskPaused(): boolean {
    return this.isPaused
  }
}
