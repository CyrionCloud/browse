import { EventEmitter } from 'events'
import { logger } from '../utils/logger'
import { BrowserUseAgent } from './BrowserUseAgent'
import { OwlService } from './OwlService'
import { AgentService } from './AgentService'
import type {
  ActionResult,
  OwlElement,
  OwlAnalysisResult,
  DomTree,
  ActionType
} from '@autobrowse/shared'

interface VisionEnhancedAction {
  action: ActionType
  selector?: string
  coordinates?: { x: number; y: number }
  value?: string
  description: string
  owlElements?: OwlElement[]
}

interface VisionFeedbackLoop {
  iteration: number
  action: string
  screenshotTaken: boolean
  owlAnalysis: OwlAnalysisResult | null
  fallbackTriggered: boolean
  fallbackSuccess: boolean
  timestamp: Date
}

interface ElementMatchScore {
  element: OwlElement
  score: number
  matchReason: string
}

export class OwlEnhancedBrowserService extends EventEmitter {
  private browserAgent: BrowserUseAgent
  private owlService: OwlService
  private agentService: AgentService
  private sessionId?: string
  private feedbackHistory: VisionFeedbackLoop[] = []
  private maxIterations: number
  private owlFallbackThreshold: number
  private isExecuting: boolean = false
  private isPaused: boolean = false

  constructor(config?: {
    sessionId?: string
    maxIterations?: number
    owlFallbackThreshold?: number
    agentConfig?: any
  }) {
    super()

    this.sessionId = config?.sessionId
    this.maxIterations = config?.maxIterations || 50
    this.owlFallbackThreshold = config?.owlFallbackThreshold || 5

    this.browserAgent = new BrowserUseAgent()
    this.owlService = new OwlService()
    this.agentService = new AgentService(config?.agentConfig)

    this.setupEventListeners()

    logger.info('OwlEnhancedBrowserService initialized', {
      sessionId: this.sessionId,
      maxIterations: this.maxIterations,
      owlFallbackThreshold: this.owlFallbackThreshold
    })
  }

  private setupEventListeners(): void {
    this.browserAgent.on('ready', () => {
      logger.info('BrowserAgent ready')
      this.emit('browser_ready')
    })

    this.browserAgent.on('action_executed', (result) => {
      this.emit('action_executed', result)
    })

    this.browserAgent.on('action_failed', (result) => {
      this.emit('action_failed', result)
    })

    this.owlService.on('ready', () => {
      logger.info('OwlService ready')
      this.emit('owl_ready')
    })

    this.owlService.on('analysis_complete', (data) => {
      this.emit('owl_analysis_complete', data)
    })

    this.owlService.on('elements_detected', (data) => {
      this.emit('owl_elements_detected', data)
    })
  }

  async executeTaskWithVisionFeedback(
    task: string,
    options?: {
      ocrEngine?: 'tesseract' | 'easyocr' | 'paddleocr'
      languages?: string[]
      useMLDetection?: boolean
      confidenceThreshold?: number
    }
  ): Promise<ActionResult[]> {
    if (this.isExecuting) {
      throw new Error('Task execution already in progress')
    }

    this.isExecuting = true
    this.isPaused = false
    this.feedbackHistory = []

    const results: ActionResult[] = []

    try {
      logger.info('Starting task execution with vision feedback', { task, options })

      let iteration = 0
      let domTree: DomTree | undefined

      while (iteration < this.maxIterations && this.isExecuting && !this.isPaused) {
        iteration++

        logger.info(`Execution iteration ${iteration}/${this.maxIterations}`)

        const feedbackLoop: VisionFeedbackLoop = {
          iteration,
          action: 'unknown',
          screenshotTaken: false,
          owlAnalysis: null,
          fallbackTriggered: false,
          fallbackSuccess: false,
          timestamp: new Date()
        }

        try {
          const action = await this.planNextAction(task, iteration, domTree)
          feedbackLoop.action = action.action

          this.emit('step_starting', { iteration, action })

          let result: ActionResult

          if (action.action === 'navigate') {
            const url = action.value || 'https://example.com'
            result = await this.browserAgent.navigate(url)
            domTree = await this.browserAgent.getDomTree()
          } else if (domTree) {
            result = await this.executeActionWithVision(domTree, action)
          } else {
            result = {
              success: false,
              action: action.action,
              description: action.description,
              error: 'No DOM tree available',
              duration: 0
            }
          }

          const screenshot = await this.browserAgent.screenshot()
          feedbackLoop.screenshotTaken = true

          const owlAnalysis = await this.analyzeScreenshotWithOwl(
            screenshot,
            options
          )
          feedbackLoop.owlAnalysis = owlAnalysis

          if (!result.success && iteration > this.owlFallbackThreshold) {
            feedbackLoop.fallbackTriggered = true
            const fallbackResult = await this.executeOwlFallback(
              action,
              owlAnalysis
            )
            feedbackLoop.fallbackSuccess = fallbackResult.success

            if (fallbackResult.success) {
              result = fallbackResult
              this.emit('owl_fallback_used', {
                iteration,
                originalAction: action,
                owlElements: owlAnalysis.elements.length
              })
            }
          }

          results.push(result)
          this.emit('step_completed', { iteration, action, result })

        } catch (error: any) {
          logger.error(`Error in iteration ${iteration}`, { error })

          results.push({
            success: false,
            action: feedbackLoop.action,
            description: 'Execution failed',
            error: error.message
          })

          this.emit('step_failed', { iteration, error })
        }

        this.feedbackHistory.push(feedbackLoop)

        await this.delay(500)
      }

      this.emit('task_complete', { results, iterations: iteration })
      logger.info('Task execution completed', { results, iterations: iteration })

      return results
    } catch (error: any) {
      logger.error('Task execution failed', { error })
      this.emit('task_failed', { error })

      return [{
        success: false,
        action: 'execute_task',
        description: 'Task execution failed',
        error: error.message,
        duration: 0
      }]
    } finally {
      this.isExecuting = false
      this.isPaused = false
    }
  }

  private async planNextAction(
    task: string,
    iteration: number,
    domTree?: DomTree
  ): Promise<VisionEnhancedAction> {
    try {
      const prompt = this.buildActionPlanningPrompt(task, iteration, domTree)
      const response = await this.agentService.chat(prompt)

      const action = this.parseActionFromResponse(response)

      logger.debug('Next action planned', { action, iteration })

      return action
    } catch (error) {
      logger.error('Failed to plan next action', { error })

      return {
        action: 'navigate',
        description: task
      }
    }
  }

  private buildActionPlanningPrompt(
    task: string,
    iteration: number,
    domTree?: DomTree
  ): string {
    let prompt = `Task: ${task}\nCurrent iteration: ${iteration}`

    if (domTree) {
      prompt += `\n\nCurrent page:\nURL: ${domTree.url}\nTitle: ${domTree.title}`
      prompt += `\nElements on page: ${domTree.elements.length}`

      const interactiveElements = domTree.elements.filter(
        (el) => ['button', 'link', 'input'].includes(el.tag)
      )

      if (interactiveElements.length > 0) {
        prompt += `\nInteractive elements (sample):`
        interactiveElements.slice(0, 10).forEach((el) => {
          prompt += `\n- <${el.tag}>${el.text ? `: ${el.text}` : ''}</${el.tag}>`
        })
      }
    }

    prompt += `\n\nDetermine the next action to complete the task.`
    prompt += `\nReturn a JSON object with this structure:`
    prompt += `\n{\n  "action": "navigate|click|type|scroll|extract|wait",`
    prompt += `\n  "selector": "CSS selector if applicable",`
    prompt += `\n  "description": "Brief description of what to do",`
    prompt += `\n  "value": "URL for navigate, text for type, or null"\n}`

    return prompt
  }

  private parseActionFromResponse(response: string): VisionEnhancedAction {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        return {
          action: 'navigate',
          description: response
        }
      }

      const parsed = JSON.parse(jsonMatch[0])

      return {
        action: parsed.action || 'navigate',
        selector: parsed.selector,
        value: parsed.value,
        description: parsed.description || 'No description'
      }
    } catch (error) {
      logger.error('Failed to parse action from response', { error })

      return {
        action: 'navigate',
        description: response
      }
    }
  }

  private async executeActionWithVision(
    domTree: DomTree | undefined,
    action: VisionEnhancedAction
  ): Promise<ActionResult> {
    try {
      let result: ActionResult

      switch (action.action) {
        case 'click':
          result = await this.browserAgent.click(action.selector || 'body')
          break
        case 'type':
          result = await this.browserAgent.type(
            action.selector || 'input[type="text"]',
            action.value || ''
          )
          break
        case 'scroll':
          const direction = action.description?.toLowerCase().includes('up') ? 'up' : 'down'
          result = await this.browserAgent.scroll(direction)
          break
        case 'extract':
          result = await this.browserAgent.extract(action.selector || 'body')
          break
        case 'wait':
          const waitTime = parseInt(action.value || '1000')
          await this.delay(waitTime)
          result = {
            success: true,
            action: 'wait',
            description: `Waited ${waitTime}ms`,
            duration: waitTime
          }
          break
        default:
          result = {
            success: false,
            action: action.action,
            description: action.description,
            error: 'Unknown action type',
            duration: 0
          }
      }

      return result
    } catch (error: any) {
      logger.error('Failed to execute action with vision', { error, action })

      return {
        success: false,
        action: action.action,
        description: action.description,
        error: error.message,
        duration: 0
      }
    }
  }

  private async analyzeScreenshotWithOwl(
    screenshot: Buffer,
    options?: {
      ocrEngine?: 'tesseract' | 'easyocr' | 'paddleocr'
      languages?: string[]
      useMLDetection?: boolean
      confidenceThreshold?: number
    }
  ): Promise<OwlAnalysisResult> {
    try {
      logger.debug('Analyzing screenshot with Owl')

      const analysis = await this.owlService.analyzeScreenshot(screenshot, {
        ocrEngine: options?.ocrEngine || 'paddleocr',
        languages: options?.languages || ['en', 'ch_sim'],
        useMLDetection: options?.useMLDetection !== false
      })

      logger.debug('Owl analysis complete', {
        elementCount: analysis.elements.length,
        textCount: analysis.text.length
      })

      return analysis
    } catch (error: any) {
      logger.error('Owl screenshot analysis failed', { error })

      return {
        elements: [],
        text: [],
        layout: {} as any,
        image_size: { width: 0, height: 0 },
        ml_detection_used: false,
        timestamp: new Date().toISOString()
      }
    }
  }

  private async executeOwlFallback(
    action: VisionEnhancedAction,
    owlAnalysis: OwlAnalysisResult
  ): Promise<ActionResult> {
    try {
      logger.info('Executing Owl fallback', { action, elementCount: owlAnalysis.elements.length })

      const bestMatch = this.findBestElementMatch(
        action.description,
        owlAnalysis.elements
      )

      if (!bestMatch) {
        logger.warn('No matching element found in Owl analysis')
        return {
          success: false,
          action: action.action,
          description: action.description,
          error: 'Owl fallback: no matching element found',
          duration: 0
        }
      }

      logger.info('Owl fallback found matching element', {
        elementId: bestMatch.element.id,
        score: bestMatch.score,
        reason: bestMatch.matchReason
      })

      const result = await this.executeActionWithVision(undefined, {
        action: action.action,
        coordinates: bestMatch.element.coordinates,
        description: `Owl fallback: ${action.description}`
      })

      if (result.success) {
        logger.info('Owl fallback succeeded')
      }

      return result
    } catch (error: any) {
      logger.error('Owl fallback failed', { error })

      return {
        success: false,
        action: action.action,
        description: action.description,
        error: `Owl fallback failed: ${error.message}`,
        duration: 0
      }
    }
  }

  private findBestElementMatch(
    description: string,
    elements: OwlElement[]
  ): ElementMatchScore | null {
    if (elements.length === 0) {
      return null
    }

    const descLower = description.toLowerCase()
    const scores: ElementMatchScore[] = []

    for (const element of elements) {
      let score = 0
      let matchReason = ''

      if (element.text && descLower.includes(element.text.toLowerCase())) {
        score += 50
        matchReason = 'text match'
      }

      const typeMatch = descLower.includes(element.type.toLowerCase())
      if (typeMatch) {
        score += 30
        matchReason += matchReason ? ', type match' : 'type match'
      }

      if (element.confidence > 0.8) {
        score += 20
        matchReason += matchReason ? ', high confidence' : 'high confidence'
      }

      if (score > 0) {
        scores.push({
          element,
          score,
          matchReason
        })
      }
    }

    if (scores.length === 0) {
      return null
    }

    scores.sort((a, b) => b.score - a.score)

    return scores[0]
  }

  pause(): void {
    if (!this.isExecuting) {
      return
    }

    this.isPaused = true

    this.emit('execution_paused', { sessionId: this.sessionId })

    logger.info('OwlEnhancedBrowserService paused')
  }

  resume(): void {
    if (!this.isPaused) {
      return
    }

    this.isPaused = false

    this.emit('execution_resumed', { sessionId: this.sessionId })

    logger.info('OwlEnhancedBrowserService resumed')
  }

  cancel(): void {
    this.isExecuting = false
    this.isPaused = false

    this.emit('execution_cancelled', { sessionId: this.sessionId })

    logger.info('OwlEnhancedBrowserService cancelled')
  }

  getFeedbackHistory(): VisionFeedbackLoop[] {
    return [...this.feedbackHistory]
  }

  getStatus() {
    return {
      isExecuting: this.isExecuting,
      isPaused: this.isPaused,
      sessionId: this.sessionId,
      currentIteration: this.feedbackHistory.length,
      maxIterations: this.maxIterations,
      browserAgentReady: this.browserAgent.isReady(),
      owlServiceReady: this.owlService.isReady()
    }
  }

  async cleanup(): Promise<void> {
    logger.info('Cleaning up OwlEnhancedBrowserService')

    await this.browserAgent.cleanup()
    await this.owlService.cleanup()

    this.feedbackHistory = []
    this.isExecuting = false
    this.isPaused = false

    logger.info('OwlEnhancedBrowserService cleanup complete')
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
