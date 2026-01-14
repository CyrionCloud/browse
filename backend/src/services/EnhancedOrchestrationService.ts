import { EventEmitter } from 'events'
import { logger } from '../utils/logger'
import { BrowserUseAgent } from './BrowserUseAgent'
import { OwlService } from './OwlService'
import { AgentService } from './AgentService'
import type {
  ActionResult,
  DomTree,
  DomElement,
  OwlElement
} from '@autobrowse/shared'

interface ExecutionStep {
  id: string
  action: string
  description: string
  status: 'pending' | 'executing' | 'completed' | 'failed'
  result?: ActionResult
  timestamp: Date
}

interface ExecutionPlan {
  steps: ExecutionStep[]
  currentStep: number
  status: 'planning' | 'executing' | 'paused' | 'completed' | 'failed'
}

interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export class EnhancedOrchestrationService extends EventEmitter {
  private browserAgent: BrowserUseAgent
  private owlService: OwlService
  private agentService: AgentService
  private currentPlan: ExecutionPlan | null = null
  private executionHistory: Map<string, ExecutionPlan[]> = new Map()
  private isExecuting: boolean = false
  private isPaused: boolean = false

  constructor(config?: { sessionId?: string; agentConfig?: any }) {
    super()

    this.browserAgent = new BrowserUseAgent()
    this.owlService = new OwlService()
    this.agentService = new AgentService(config?.agentConfig)

    this.setupEventListeners()

    logger.info('EnhancedOrchestrationService initialized', { config })
  }

  private setupEventListeners(): void {
    this.browserAgent.on('ready', () => {
      logger.info('BrowserUseAgent ready')
      this.emit('browser_ready')
    })

    this.browserAgent.on('action_executed', (result) => {
      this.emit('action_executed', result)
    })

    this.browserAgent.on('action_failed', (result) => {
      this.emit('action_failed', result)
    })

    this.browserAgent.on('dom_tree_received', (domTree) => {
      this.emit('dom_tree_received', domTree)
    })

    this.owlService.on('ready', () => {
      logger.info('OwlService ready')
      this.emit('owl_ready')
    })

    this.owlService.on('analysis_complete', (data) => {
      this.emit('owl_analysis_complete', data)
    })

    this.owlService.on('text_extracted', (data) => {
      this.emit('owl_text_extracted', data)
    })

    this.owlService.on('elements_detected', (data) => {
      this.emit('owl_elements_detected', data)
    })
  }

  async createExecutionPlan(
    task: string,
    domTree?: DomTree
  ): Promise<ExecutionPlan> {
    const startTime = Date.now()

    logger.info('Creating execution plan', { task })

    try {
      this.emit('planning', { task, status: 'Creating plan...' })

      let context = ''

      if (domTree) {
        context = `\n\nCurrent page context:\nURL: ${domTree.url}\nTitle: ${domTree.title}\nElements: ${domTree.elements.length}`
      }

      const prompt = `Task: ${task}${context}\n\nPlan the browser actions needed to complete this task.
Break down into specific steps:
1. Navigation actions (URL to go to)
2. Click actions (elements to click on)
3. Form input actions (text to type)
4. Scroll actions (up/down to find elements)
5. Data extraction actions (text to copy)

Return your plan as a JSON array of actions with this structure:
[
  {
    "action": "navigate|click|type|scroll|extract",
    "description": "Brief description of what to do",
    "selector": "CSS selector if known (otherwise leave empty)",
    "target_description": "User-friendly description for element targeting"
  }
]`

      const response = await this.agentService.chat(prompt)

      const actions = this.parseActionsFromResponse(response)

      const plan: ExecutionPlan = {
        steps: actions.map((action, index) => ({
          id: `step-${index}`,
          action: action.action,
          description: action.description,
          status: 'pending',
          timestamp: new Date()
        })),
        currentStep: 0,
        status: 'executing'
      }

      this.currentPlan = plan

      logger.info('Execution plan created', { stepCount: plan.steps.length, duration: Date.now() - startTime })

      this.emit('plan_created', { plan, duration: Date.now() - startTime })

      return plan
    } catch (error: any) {
      logger.error('Failed to create execution plan', { error })

      const plan: ExecutionPlan = {
        steps: [{
          id: 'step-0',
          action: 'navigate',
          description: task,
          status: 'failed',
          timestamp: new Date()
        }],
        currentStep: 0,
        status: 'failed'
      }

      this.currentPlan = plan
      this.emit('plan_failed', { error })

      return plan
    }
  }

  private parseActionsFromResponse(response: string): Array<{ action: string; description: string; selector?: string }> {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        return [{ action: 'navigate', description: response }]
      }

      const actions = JSON.parse(jsonMatch[0])
      return actions
    } catch (error) {
      logger.error('Failed to parse actions from response', { error })
      return [{ action: 'navigate', description: response }]
    }
  }

  async validateAction(step: ExecutionStep, domTree?: DomTree): Promise<ValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []

    logger.info('Validating action', { step })

    if (domTree) {
      const hasRequiredSelectors = ['click', 'type', 'extract'].includes(step.action)

      if (hasRequiredSelectors && !this.extractSelectorFromDescription(step.description, domTree)) {
        warnings.push('No selector specified - using element description')
      }
    }

    if (step.action === 'navigate') {
      const url = this.extractUrlFromDescription(step.description)
      if (!url) {
        errors.push('Could not extract URL from description')
      }
    }

    const valid = errors.length === 0

    logger.info('Action validation complete', { step, valid, errors, warnings })

    return { valid, errors, warnings }
  }

  private extractSelectorFromDescription(description: string, domTree: DomTree): string | null {
    const descLower = description.toLowerCase()

    for (const element of domTree.elements) {
      if (element.text && element.text.toLowerCase().includes(descLower)) {
        if (element.attributes.id) {
          return `#${element.attributes.id}`
        }
        if (element.attributes.class) {
          return `.${element.attributes.class}`
        }
      }
    }

    return null
  }

  private extractUrlFromDescription(description: string): string | null {
    const urlMatch = description.match(/https?:\/\/[^\s]+/)
    return urlMatch ? urlMatch[0] : null
  }

  async executeAdaptivePlan(
    task: string,
    config?: { useOwlFallback?: boolean; maxSteps?: number }
  ): Promise<ActionResult[]> {
    if (this.isExecuting) {
      throw new Error('Execution already in progress')
    }

    this.isExecuting = true
    this.isPaused = false

    const results: ActionResult[] = []

    try {
      logger.info('Starting adaptive execution', { task, config })

      let domTree: DomTree | undefined
      let currentScreenshot: Buffer | undefined

      for (let i = 0; i < (config?.maxSteps || 50); i++) {
        if (!this.isExecuting || this.isPaused) {
          break
        }

        const currentStep = this.currentPlan!.steps[i]

        this.emit('step_starting', { step: currentStep })

        const validation = await this.validateAction(currentStep, domTree)
        if (!validation.valid) {
          this.emit('step_validation_failed', { step: currentStep, errors: validation.errors })
          results.push({
            success: false,
            action: currentStep.action,
            description: currentStep.description,
            error: validation.errors.join(', ')
          })
          break
        }

        currentStep.status = 'executing'

        let actionResult: ActionResult

        if (currentStep.action === 'navigate') {
          const url = this.extractUrlFromDescription(currentStep.description) || 'https://example.com'
          actionResult = await this.browserAgent.navigate(url)
          domTree = await this.browserAgent.getDomTree()
          currentScreenshot = await this.browserAgent.screenshot()
        } else if (currentStep.action === 'click') {
          const selector = this.extractSelectorFromDescription(currentStep.description, domTree!) || 'body'
          actionResult = await this.browserAgent.click(selector)
          currentScreenshot = await this.browserAgent.screenshot()
        } else if (currentStep.action === 'type') {
          const selector = this.extractSelectorFromDescription(currentStep.description, domTree!) || 'input[type="text"]'
          const text = currentStep.description
          actionResult = await this.browserAgent.type(selector, text)
        } else if (currentStep.action === 'scroll') {
          const direction = currentStep.description.includes('up') ? 'up' : 'down'
          actionResult = await this.browserAgent.scroll(direction)
        } else if (currentStep.action === 'extract') {
          const selector = this.extractSelectorFromDescription(currentStep.description, domTree!) || 'body'
          actionResult = await this.browserAgent.extract(selector)
        } else if (currentStep.action === 'wait') {
          actionResult = {
            success: true,
            action: 'wait',
            description: currentStep.description,
            duration: 0
          }
        } else {
          actionResult = {
            success: false,
            action: currentStep.action,
            description: currentStep.description,
            error: 'Unknown action type',
            duration: 0
          }
        }

        currentStep.status = actionResult.success ? 'completed' : 'failed'

        this.emit('step_completed', { step: currentStep, result: actionResult })

        results.push(actionResult)

        if (config?.useOwlFallback && i > 5 && this.owlService.isReady()) {
          try {
            const owlElements = await this.owlService.detectElements(currentScreenshot!)
            logger.info('Owl elements detected', { count: owlElements.length })

            if (owlElements.length > 0) {
              this.emit('owl_fallback_used', { elementCount: owlElements.length })
            }
          } catch (error) {
            logger.warn('Owl fallback failed', { error })
          }
        }

        await new Promise(resolve => setTimeout(resolve, 500))
      }

      this.currentPlan!.status = 'completed'
      this.emit('execution_complete', { results, totalSteps: this.currentPlan!.steps.length })

      return results
    } catch (error: any) {
      logger.error('Adaptive execution failed', { error })

      this.currentPlan!.status = 'failed'

      this.emit('execution_failed', { error })

      return [{
        success: false,
        action: 'execute_adaptive_plan',
        description: 'Execute adaptive plan',
        error: error.message || 'Unknown error',
        duration: 0
      }]
    } finally {
      this.isExecuting = false
      this.isPaused = false
    }
  }

  pause(): void {
    if (!this.isExecuting) {
      return
    }

    this.isPaused = true
    this.currentPlan!.status = 'paused'

    this.emit('execution_paused', { currentStep: this.currentPlan!.currentStep })

    logger.info('Execution paused')
  }

  resume(): void {
    if (!this.isPaused) {
      return
    }

    this.isPaused = false
    this.currentPlan!.status = 'executing'

    this.emit('execution_resumed', { currentStep: this.currentPlan!.currentStep })

    logger.info('Execution resumed')
  }

  cancel(): void {
    this.isExecuting = false
    this.isPaused = false

    if (this.currentPlan) {
      this.currentPlan.status = 'failed'
    }

    this.emit('execution_cancelled', { currentStep: this.currentPlan!.currentStep })

    logger.info('Execution cancelled')
  }

  async undoLastAction(): Promise<ActionResult | null> {
    if (!this.currentPlan || this.currentPlan!.currentStep <= 0) {
      logger.warn('Nothing to undo')
      return null
    }

    const lastStep = this.currentPlan!.steps[this.currentPlan!.currentStep - 1]

    if (lastStep.status !== 'completed') {
      logger.warn('Last step not completed, cannot undo')
      return null
    }

    logger.info('Undoing last action', { step: lastStep })

    this.emit('action_undone', { step: lastStep })

    this.currentPlan!.currentStep--

    return {
      success: true,
      action: 'undo',
      description: `Undo ${lastStep.description}`,
      duration: 0
    }
  }

  async redoAction(): Promise<ActionResult | null> {
    if (!this.currentPlan) {
      logger.warn('No plan to redo')
      return null
    }

    const nextStep = this.currentPlan!.steps[this.currentPlan!.currentStep + 1]

    if (!nextStep || nextStep.status !== 'completed') {
      logger.warn('Next action not available for redo')
      return null
    }

    logger.info('Redoing action', { step: nextStep })

    this.emit('action_redone', { step: nextStep })

    this.currentPlan!.currentStep++

    return {
      success: true,
      action: 'redo',
      description: `Redo ${nextStep.description}`,
      duration: 0
    }
  }

  getCurrentPlan(): ExecutionPlan | null {
    return this.currentPlan
  }

  getCurrentStep(): ExecutionStep | null {
    if (!this.currentPlan) {
      return null
    }
    return this.currentPlan!.steps[this.currentPlan!.currentStep] || null
  }

  async cleanup(): Promise<void> {
    logger.info('Cleaning up EnhancedOrchestrationService')

    await this.browserAgent.cleanup()
    await this.owlService.cleanup()

    this.currentPlan = null
    this.isExecuting = false
    this.isPaused = false
    this.executionHistory.clear()

    logger.info('EnhancedOrchestrationService cleanup complete')
  }

  getExecutionHistory(sessionId: string): ExecutionPlan[] {
    return this.executionHistory.get(sessionId) || []
  }

  saveExecutionHistory(sessionId: string): void {
    if (this.currentPlan) {
      if (!this.executionHistory.has(sessionId)) {
        this.executionHistory.set(sessionId, [])
      }
      this.executionHistory.get(sessionId)!.push({ ...this.currentPlan })
    }

    logger.info('Execution history saved', { sessionId, planCount: this.executionHistory.get(sessionId)!.length })
  }

  isExecutingExecution(): boolean {
    return this.isExecuting
  }

  isPausedExecution(): boolean {
    return this.isPaused
  }

  getStatus() {
    return {
      isExecuting: this.isExecuting,
      isPaused: this.isPaused,
      currentPlan: this.currentPlan,
      browserAgentReady: this.browserAgent.isReady(),
      owlServiceReady: this.owlService.isReady()
    }
  }
}
