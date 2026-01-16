import { EventEmitter } from 'events'
import { logger } from '../utils/logger'
import { PythonBridge, PythonBridgePool } from './PythonBridge'
import { AgentService } from './AgentService'
import { supabase } from '../lib/supabase'
import type {
  ActionResult,
  AgentConfig,
  BrowserSession,
  Skill,
  DomTree
} from '@autobrowse/shared'

/**
 * Latency metrics for monitoring
 */
export interface LatencyMetrics {
  actionLatencies: number[]
  p50: number
  p95: number
  p99: number
  avg: number
  min: number
  max: number
}

/**
 * Task execution options
 */
interface ExecutionOptions {
  sessionId: string
  userId: string
  taskDescription: string
  agentConfig?: Partial<AgentConfig>
  enabledSkills?: string[]
  onProgress?: (progress: TaskProgress) => void
  onAction?: (result: ActionResult) => void
  onScreenshot?: (screenshot: string) => void
  onDomTree?: (domTree: DomTree) => void
}

interface TaskProgress {
  status: 'initializing' | 'planning' | 'executing' | 'analyzing' | 'completed' | 'failed' | 'paused'
  currentStep: number
  totalSteps: number
  currentAction?: string
  latency?: number
  error?: string
}

/**
 * IntegratedAutomationService - Combines browser-use Agent, Owl Vision, and Skills
 *
 * This service properly integrates all components:
 * 1. Uses browser-use Agent for intelligent task execution (not hardcoded Playwright)
 * 2. Sends DOM context to AI for better planning
 * 3. Analyzes screenshots with Owl vision
 * 4. Applies enabled skills to task execution
 * 5. Tracks latency metrics
 */
export class IntegratedAutomationService extends EventEmitter {
  private bridgePool: PythonBridgePool
  private activeSessions: Map<string, {
    bridge: PythonBridge
    isPaused: boolean
    isRunning: boolean
  }> = new Map()
  private latencyMetrics: Map<string, LatencyMetrics> = new Map()

  constructor() {
    super()
    this.bridgePool = new PythonBridgePool({
      maxProcesses: 10, // Increased from 5 to handle 10+ concurrent sessions
      timeout: 300000,
      maxMemoryMB: 1024,
      maxCpuPercent: 80
    })

    this.bridgePool.on('process_spawned', (data) => {
      logger.info('Browser automation process spawned', data)
    })

    this.bridgePool.on('process_closed', (data) => {
      logger.info('Browser automation process closed', data)
    })

    logger.info('IntegratedAutomationService initialized with 10+ session capacity')
  }

  /**
   * Execute a task using browser-use Agent with full integration
   */
  async executeTask(options: ExecutionOptions): Promise<ActionResult[]> {
    const {
      sessionId,
      userId,
      taskDescription,
      agentConfig,
      enabledSkills = [],
      onProgress,
      onAction,
      onScreenshot,
      onDomTree
    } = options

    const results: ActionResult[] = []
    const actionLatencies: number[] = []

    try {
      // Get or create bridge for this session
      const bridge = this.bridgePool.getBridge(sessionId)

      this.activeSessions.set(sessionId, {
        bridge,
        isPaused: false,
        isRunning: true
      })

      // Emit progress
      const emitProgress = (progress: TaskProgress) => {
        this.emit('progress', { sessionId, ...progress })
        onProgress?.(progress)
      }

      // 1. INITIALIZING - Load skills and build enhanced prompt
      emitProgress({
        status: 'initializing',
        currentStep: 0,
        totalSteps: 0,
        currentAction: 'Loading skills and configuration...'
      })

      // Load enabled skills from database
      const skills = await this.loadEnabledSkills(userId, enabledSkills)
      const enhancedTask = this.buildEnhancedPrompt(taskDescription, skills, agentConfig)

      logger.info('Task enhanced with skills', {
        originalTask: taskDescription,
        skillCount: skills.length,
        skillNames: skills.map(s => s.name)
      })

      // 2. Run browser-use Agent for intelligent execution
      emitProgress({
        status: 'executing',
        currentStep: 0,
        totalSteps: 0,
        currentAction: 'Starting intelligent browser automation...'
      })

      const startTime = Date.now()

      // Call Python bridge's run_agent - this uses browser-use Agent with LLM
      const agentResult = await bridge.call<{
        success: boolean
        task: string
        actions_executed: number
        result: string | null
        error?: string
      }>('browser_use', 'run_agent', {
        task: enhancedTask,
        config: {
          headless: agentConfig?.vision ? false : true, // Non-headless if vision enabled
          maxSteps: agentConfig?.maxSteps || 50,
          highlightElements: agentConfig?.highlightElements ?? true,
          viewport: { width: 1280, height: 720 }
        }
      }, { sessionId, timeout: 300000 })

      const totalDuration = Date.now() - startTime

      if (!agentResult.success) {
        throw new Error(agentResult.error || 'Agent execution failed')
      }

      // 3. Get final screenshot for vision analysis
      if (agentConfig?.vision) {
        emitProgress({
          status: 'analyzing',
          currentStep: 1,
          totalSteps: 1,
          currentAction: 'Analyzing results with vision...'
        })

        try {
          const screenshotResult = await bridge.call<{ success: boolean; screenshot: string }>(
            'browser_use', 'screenshot', {}, { sessionId }
          )

          if (screenshotResult.success && screenshotResult.screenshot) {
            onScreenshot?.(screenshotResult.screenshot)

            // Analyze with Owl vision
            const visionResult = await bridge.call<{
              success: boolean
              elements: any[]
              text: string[]
              layout: any
            }>('owl', 'analyze_screenshot', {
              screenshot: screenshotResult.screenshot
            }, { sessionId })

            if (visionResult.success) {
              logger.info('Vision analysis complete', {
                elementsDetected: visionResult.elements?.length || 0,
                textRegions: visionResult.text?.length || 0
              })
            }
          }
        } catch (visionError) {
          logger.warn('Vision analysis failed, continuing without', { error: visionError })
        }
      }

      // 4. Get DOM tree for context
      try {
        const domResult = await bridge.call<DomTree & { success: boolean }>(
          'browser_use', 'get_dom_tree', {}, { sessionId }
        )

        if (domResult.success) {
          const domTree: DomTree = {
            url: domResult.url,
            title: domResult.title,
            elements: domResult.elements
          }
          onDomTree?.(domTree)
          this.emit('dom_tree', { sessionId, domTree })
        }
      } catch (domError) {
        logger.warn('DOM tree extraction failed', { error: domError })
      }

      // Create result
      const actionResult: ActionResult = {
        success: true,
        action: 'run_agent',
        description: taskDescription,
        value: agentResult.result || undefined,
        duration: totalDuration
      }

      results.push(actionResult)
      actionLatencies.push(totalDuration)
      onAction?.(actionResult)

      // Track latency metrics
      this.updateLatencyMetrics(sessionId, actionLatencies)

      // 5. COMPLETED
      emitProgress({
        status: 'completed',
        currentStep: agentResult.actions_executed,
        totalSteps: agentResult.actions_executed,
        latency: totalDuration
      })

      this.emit('complete', { sessionId, results, latencyMetrics: this.getLatencyMetrics(sessionId) })

      logger.info('Task execution completed', {
        sessionId,
        actionsExecuted: agentResult.actions_executed,
        totalDuration,
        latencyP50: this.getLatencyMetrics(sessionId)?.p50
      })

      return results

    } catch (error: any) {
      logger.error('Task execution failed', { sessionId, error: error.message })

      const progress: TaskProgress = {
        status: 'failed',
        currentStep: 0,
        totalSteps: 0,
        error: error.message
      }

      this.emit('progress', { sessionId, ...progress })
      onProgress?.(progress)
      this.emit('error', { sessionId, error })

      throw error
    } finally {
      // Cleanup session state
      const session = this.activeSessions.get(sessionId)
      if (session) {
        session.isRunning = false
      }
    }
  }

  /**
   * Execute task with step-by-step control (for when you need more granular control)
   */
  async executeTaskStepByStep(options: ExecutionOptions): Promise<ActionResult[]> {
    const {
      sessionId,
      userId,
      taskDescription,
      agentConfig,
      enabledSkills = [],
      onProgress,
      onAction,
      onScreenshot,
      onDomTree
    } = options

    logger.info('executeTaskStepByStep starting', { sessionId, taskDescription, agentConfig })

    const results: ActionResult[] = []
    const actionLatencies: number[] = []

    try {
      logger.info('Getting Python bridge for session', { sessionId })
      const bridge = this.bridgePool.getBridge(sessionId)
      logger.info('Python bridge obtained', { sessionId })

      this.activeSessions.set(sessionId, {
        bridge,
        isPaused: false,
        isRunning: true
      })

      const emitProgress = (progress: TaskProgress) => {
        this.emit('progress', { sessionId, ...progress })
        onProgress?.(progress)
      }

      // Load skills
      logger.info('Loading enabled skills', { sessionId, userId, enabledSkills })
      const skills = await this.loadEnabledSkills(userId, enabledSkills)
      logger.info('Skills loaded', { sessionId, skillCount: skills.length })

      // Create AgentService for planning
      logger.info('Creating AgentService', { sessionId })
      const agentService = new AgentService(agentConfig)

      // 1. Get initial DOM context
      emitProgress({
        status: 'initializing',
        currentStep: 0,
        totalSteps: 0,
        currentAction: 'Analyzing page structure...'
      })

      // Navigate to initial URL if provided in task
      const urlMatch = taskDescription.match(/https?:\/\/[^\s]+/)
      if (urlMatch) {
        logger.info('Navigating to URL', { sessionId, url: urlMatch[0] })
        try {
          await bridge.call('browser_use', 'navigate', {
            url: urlMatch[0]
          }, { sessionId })
          logger.info('Navigation successful', { sessionId })

          // Always capture screenshot after navigation
          try {
            const navScreenshot = await bridge.call<{ success: boolean; screenshot: string }>(
              'browser_use', 'screenshot', {}, { sessionId }
            )
            if (navScreenshot.success && navScreenshot.screenshot) {
              logger.info('Initial screenshot captured', { sessionId, length: navScreenshot.screenshot.length })
              onScreenshot?.(navScreenshot.screenshot)
            }
          } catch (e) {
            logger.warn('Failed to capture initial screenshot', { sessionId })
          }
        } catch (navError: any) {
          logger.error('Navigation failed', { sessionId, error: navError.message })
        }
      } else {
        logger.info('No URL found in task, skipping navigation', { sessionId })
        // Capture initial screenshot of browser even without navigation
        try {
          const initialScreenshot = await bridge.call<{ success: boolean; screenshot: string }>(
            'browser_use', 'screenshot', {}, { sessionId }
          )
          if (initialScreenshot.success && initialScreenshot.screenshot) {
            logger.info('Initial browser screenshot captured', { sessionId })
            onScreenshot?.(initialScreenshot.screenshot)
          }
        } catch (e) {
          logger.warn('Failed to capture initial browser screenshot', { sessionId })
        }
      }

      // Get DOM context
      let domContext = ''
      try {
        const domResult = await bridge.call<DomTree & { success: boolean }>(
          'browser_use', 'get_dom_tree', {}, { sessionId }
        )

        if (domResult.success) {
          domContext = this.formatDomContext(domResult)
          onDomTree?.({
            url: domResult.url,
            title: domResult.title,
            elements: domResult.elements
          })
        }
      } catch (e) {
        logger.warn('Could not get initial DOM context')
      }

      // 2. Get screenshot and analyze with vision
      let visionContext = ''
      if (agentConfig?.vision) {
        try {
          const screenshotResult = await bridge.call<{ success: boolean; screenshot: string }>(
            'browser_use', 'screenshot', {}, { sessionId }
          )

          if (screenshotResult.success && screenshotResult.screenshot) {
            onScreenshot?.(screenshotResult.screenshot)

            const visionResult = await bridge.call<{
              success: boolean
              elements: any[]
              text: string[]
            }>('owl', 'analyze_screenshot', {
              screenshot: screenshotResult.screenshot
            }, { sessionId })

            if (visionResult.success) {
              visionContext = `\n\nVisual Analysis:\n- Detected ${visionResult.elements?.length || 0} UI elements\n- Text found: ${visionResult.text?.slice(0, 5).join(', ')}`
            }
          }
        } catch (e) {
          logger.warn('Vision analysis failed')
        }
      }

      // 3. Plan actions with full context
      emitProgress({
        status: 'planning',
        currentStep: 0,
        totalSteps: 0,
        currentAction: 'Planning actions with AI...'
      })

      const enhancedTask = this.buildEnhancedPrompt(taskDescription, skills, agentConfig)
      const fullContext = domContext + visionContext

      // Plan with DOM context
      const actions = await agentService.planBrowserActions(enhancedTask, fullContext)

      logger.info('Actions planned', { count: actions.length })

      // 4. Execute actions with pause/resume support
      for (let i = 0; i < actions.length; i++) {
        const session = this.activeSessions.get(sessionId)
        if (!session?.isRunning) {
          logger.info('Task cancelled')
          break
        }

        // Handle pause
        while (session?.isPaused) {
          emitProgress({
            status: 'paused',
            currentStep: i,
            totalSteps: actions.length
          })
          await new Promise(resolve => setTimeout(resolve, 100))
          if (!session.isRunning) break
        }

        const action = actions[i]
        const actionStartTime = Date.now()

        emitProgress({
          status: 'executing',
          currentStep: i + 1,
          totalSteps: actions.length,
          currentAction: action.description
        })

        try {
          // Map action type to bridge method
          let result: any

          switch (action.action) {
            case 'navigate':
              result = await bridge.call('browser_use', 'navigate', {
                url: action.value
              }, { sessionId })
              break
            case 'click':
              result = await bridge.call('browser_use', 'click', {
                selector: action.target,
                description: action.description
              }, { sessionId })
              break
            case 'type':
              result = await bridge.call('browser_use', 'type', {
                selector: action.target,
                text: action.value
              }, { sessionId })
              break
            case 'scroll':
              result = await bridge.call('browser_use', 'scroll', {
                direction: action.value || 'down',
                amount: 500
              }, { sessionId })
              break
            case 'extract':
              result = await bridge.call('browser_use', 'extract', {
                selector: action.target
              }, { sessionId })
              break
            case 'wait':
              await new Promise(resolve => setTimeout(resolve, parseInt(action.value || '1000')))
              result = { success: true }
              break
            case 'screenshot':
              result = await bridge.call('browser_use', 'screenshot', {}, { sessionId })
              if (result.screenshot) {
                onScreenshot?.(result.screenshot)
              }
              break
            default:
              result = { success: false, error: `Unknown action: ${action.action}` }
          }

          const duration = Date.now() - actionStartTime
          actionLatencies.push(duration)

          const actionResult: ActionResult = {
            success: result.success !== false,
            action: action.action,
            target: action.target,
            value: action.value,
            description: action.description,
            duration
          }

          // Capture screenshot after action
          try {
            const screenshot = await bridge.call<{ success: boolean; screenshot: string }>(
              'browser_use', 'screenshot', {}, { sessionId }
            )
            if (screenshot.success && screenshot.screenshot) {
              actionResult.screenshot = screenshot.screenshot
              onScreenshot?.(screenshot.screenshot)
            }
          } catch (e) {
            // Ignore screenshot errors
          }

          results.push(actionResult)
          onAction?.(actionResult)
          this.emit('action', { sessionId, result: actionResult })

        } catch (error: any) {
          const duration = Date.now() - actionStartTime
          actionLatencies.push(duration)

          const actionResult: ActionResult = {
            success: false,
            action: action.action,
            target: action.target,
            value: action.value,
            description: action.description,
            error: error.message,
            duration
          }

          results.push(actionResult)
          onAction?.(actionResult)

          logger.warn('Action failed, continuing', { action: action.action, error: error.message })
        }

        // Small delay between actions
        await new Promise(resolve => setTimeout(resolve, 300))
      }

      // Update metrics
      this.updateLatencyMetrics(sessionId, actionLatencies)

      emitProgress({
        status: 'completed',
        currentStep: actions.length,
        totalSteps: actions.length,
        latency: this.getLatencyMetrics(sessionId)?.avg
      })

      return results

    } catch (error: any) {
      logger.error('Step-by-step execution failed', { error: error.message })
      throw error
    } finally {
      const session = this.activeSessions.get(sessionId)
      if (session) {
        session.isRunning = false
      }
    }
  }

  /**
   * Load enabled skills from database
   */
  private async loadEnabledSkills(userId: string, skillIds: string[]): Promise<Skill[]> {
    try {
      if (skillIds.length === 0) {
        // Load user's enabled skills
        const { data: userSkills } = await supabase
          .from('user_skills')
          .select('skill_id')
          .eq('user_id', userId)
          .eq('enabled', true)

        if (userSkills && userSkills.length > 0) {
          skillIds = userSkills.map(us => us.skill_id)
        }
      }

      if (skillIds.length === 0) {
        return []
      }

      const { data: skills } = await supabase
        .from('skills')
        .select('*')
        .in('id', skillIds)
        .eq('is_active', true)

      return skills || []
    } catch (error) {
      logger.warn('Failed to load skills', { error })
      return []
    }
  }

  /**
   * Build enhanced prompt with skills
   */
  private buildEnhancedPrompt(
    taskDescription: string,
    skills: Skill[],
    agentConfig?: Partial<AgentConfig>
  ): string {
    let enhancedPrompt = taskDescription

    if (skills.length > 0) {
      enhancedPrompt += '\n\n--- ENABLED SKILLS ---\n'

      for (const skill of skills) {
        enhancedPrompt += `\n[${skill.name}]: ${skill.description}`
        if (skill.prompt_template) {
          enhancedPrompt += `\nInstructions: ${skill.prompt_template}`
        }
      }

      enhancedPrompt += '\n\nUse these skills when relevant to the task.'
    }

    if (agentConfig?.thinking) {
      enhancedPrompt += '\n\nThink step by step before each action.'
    }

    return enhancedPrompt
  }

  /**
   * Format DOM tree as context string for AI
   */
  private formatDomContext(domResult: DomTree & { success: boolean }): string {
    if (!domResult.elements || domResult.elements.length === 0) {
      return ''
    }

    let context = `\n\nCurrent Page: ${domResult.title} (${domResult.url})\n`
    context += 'Interactive Elements:\n'

    const formatElement = (el: any, depth: number = 0): string => {
      const indent = '  '.repeat(depth)
      let line = `${indent}- ${el.tag}`

      if (el.attributes?.id) line += `#${el.attributes.id}`
      if (el.attributes?.class) line += `.${el.attributes.class.split(' ')[0]}`
      if (el.text) line += `: "${el.text.slice(0, 50)}"`
      if (el.attributes?.href) line += ` → ${el.attributes.href}`

      return line + '\n'
    }

    for (const el of domResult.elements.slice(0, 30)) {
      context += formatElement(el)
      if (el.children) {
        for (const child of el.children.slice(0, 5)) {
          context += formatElement(child, 1)
        }
      }
    }

    return context
  }

  /**
   * Update latency metrics for a session
   */
  private updateLatencyMetrics(sessionId: string, latencies: number[]): void {
    if (latencies.length === 0) return

    const sorted = [...latencies].sort((a, b) => a - b)
    const sum = latencies.reduce((a, b) => a + b, 0)

    const metrics: LatencyMetrics = {
      actionLatencies: latencies,
      p50: sorted[Math.floor(sorted.length * 0.5)] || 0,
      p95: sorted[Math.floor(sorted.length * 0.95)] || 0,
      p99: sorted[Math.floor(sorted.length * 0.99)] || 0,
      avg: sum / latencies.length,
      min: sorted[0] || 0,
      max: sorted[sorted.length - 1] || 0
    }

    this.latencyMetrics.set(sessionId, metrics)

    // Log warning if latency exceeds 5 seconds
    if (metrics.avg > 5000) {
      logger.warn('High average latency detected', {
        sessionId,
        avgLatency: metrics.avg,
        p95: metrics.p95
      })
    }

    // Emit latency event
    this.emit('latency', { sessionId, metrics })
  }

  /**
   * Get latency metrics for a session
   */
  getLatencyMetrics(sessionId: string): LatencyMetrics | undefined {
    return this.latencyMetrics.get(sessionId)
  }

  /**
   * Pause a session
   */
  pause(sessionId: string): boolean {
    const session = this.activeSessions.get(sessionId)
    if (session) {
      session.isPaused = true
      this.emit('paused', { sessionId })
      logger.info('Session paused', { sessionId })
      return true
    }
    return false
  }

  /**
   * Resume a session
   */
  resume(sessionId: string): boolean {
    const session = this.activeSessions.get(sessionId)
    if (session) {
      session.isPaused = false
      this.emit('resumed', { sessionId })
      logger.info('Session resumed', { sessionId })
      return true
    }
    return false
  }

  /**
   * Cancel a session
   */
  cancel(sessionId: string): boolean {
    const session = this.activeSessions.get(sessionId)
    if (session) {
      session.isRunning = false
      session.isPaused = false
      this.emit('cancelled', { sessionId })
      logger.info('Session cancelled', { sessionId })
      return true
    }
    return false
  }

  /**
   * Get session status
   */
  getSessionStatus(sessionId: string): { isRunning: boolean; isPaused: boolean } | null {
    const session = this.activeSessions.get(sessionId)
    if (!session) return null
    return {
      isRunning: session.isRunning,
      isPaused: session.isPaused
    }
  }

  /**
   * Get pool statistics
   */
  getPoolStats() {
    return {
      ...this.bridgePool.getPoolStats(),
      activeSessions: this.activeSessions.size
    }
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    logger.info('Cleaning up IntegratedAutomationService')

    // Cancel all active sessions
    for (const [sessionId] of this.activeSessions) {
      this.cancel(sessionId)
    }

    await this.bridgePool.releaseAllBridges()
    this.activeSessions.clear()
    this.latencyMetrics.clear()

    logger.info('IntegratedAutomationService cleanup complete')
  }
}

// Export singleton for easy access
export const automationService = new IntegratedAutomationService()
