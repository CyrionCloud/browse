import { EventEmitter } from 'events'
import { SupabaseClient } from '@supabase/supabase-js'
import { IntegratedAutomationService, automationService, LatencyMetrics } from './IntegratedAutomationService'
import { supabase as defaultSupabase } from '../lib/supabase'
import { logger } from '../utils/logger'
import type { BrowserSession, AgentConfig, ActionResult, SessionStatus, DomTree } from '@autobrowse/shared'

interface ActiveSession {
  session: BrowserSession
  startedAt: Date
  latestScreenshot?: string
  latestDomTree?: DomTree
  supabaseClient?: SupabaseClient
}

export class SessionManager extends EventEmitter {
  private activeSessions: Map<string, ActiveSession> = new Map()

  // Helper to get the appropriate Supabase client
  private getClient(sessionId?: string, providedClient?: SupabaseClient): SupabaseClient {
    if (providedClient) return providedClient
    if (sessionId) {
      const activeSession = this.activeSessions.get(sessionId)
      if (activeSession?.supabaseClient) return activeSession.supabaseClient
    }
    return defaultSupabase
  }

  async createSession(
    userId: string,
    taskDescription: string,
    agentConfig?: Partial<AgentConfig>,
    supabaseClient?: SupabaseClient
  ): Promise<BrowserSession> {
    const supabase = supabaseClient || defaultSupabase

    try {
      // Check user quota
      const hasQuota = await this.checkUserQuota(userId, supabase)
      if (!hasQuota) {
        throw new Error('Session quota exceeded')
      }

      const { data: session, error } = await supabase
        .from('browser_sessions')
        .insert({
          user_id: userId,
          status: 'pending',
          task_description: taskDescription,
          agent_config: agentConfig,
          actions_count: 0
        })
        .select()
        .single()

      if (error) {
        logger.error('Failed to create session', { error })
        throw error
      }

      logger.info('Session created', { sessionId: session.id, userId })

      // Track analytics
      await this.trackAnalytics(userId, 'session_created', { session_id: session.id }, supabase)

      this.emit('session_created', session)

      return session as BrowserSession
    } catch (error) {
      logger.error('Create session error', { error })
      throw error
    }
  }

  async startSession(sessionId: string, supabaseClient?: SupabaseClient): Promise<void> {
    const supabase = this.getClient(sessionId, supabaseClient)

    logger.info('startSession called', { sessionId })

    try {
      const { data: session, error } = await supabase
        .from('browser_sessions')
        .select('*')
        .eq('id', sessionId)
        .single()

      logger.info('Session fetched from DB', { sessionId, found: !!session, error: error?.message })

      if (error || !session) {
        throw new Error('Session not found')
      }

      // Allow starting from pending, paused, or restarting from terminated states
      const canStart = ['pending', 'paused'].includes(session.status)
      const canRestart = ['completed', 'failed', 'cancelled'].includes(session.status)

      if (!canStart && !canRestart) {
        throw new Error(`Cannot start session with status: ${session.status}`)
      }

      // If restarting a terminated session, reset the session state
      if (canRestart) {
        logger.info('Restarting terminated session', { sessionId, previousStatus: session.status })
        await supabase
          .from('browser_sessions')
          .update({
            status: 'pending',
            error_message: null,
            result: null,
            started_at: null,
            completed_at: null,
            duration_seconds: null,
            actions_count: 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', sessionId)
      }

      // Update session status
      logger.info('Updating session status to active', { sessionId })
      await this.updateSessionStatus(sessionId, 'active', supabase)

      // Store active session with its authenticated client
      this.activeSessions.set(sessionId, {
        session: session as BrowserSession,
        startedAt: new Date(),
        supabaseClient: supabaseClient
      })

      logger.info('Emitting session_start event', { sessionId })
      this.emit('session_start', { sessionId, session })

      // Get enabled skills for user
      const enabledSkills = session.agent_config?.enabledSkills || []

      logger.info('Starting automation service', { sessionId, taskDescription: session.task_description, enabledSkills })

      // Execute task using IntegratedAutomationService
      automationService.executeTaskStepByStep({
        sessionId,
        userId: session.user_id,
        taskDescription: session.task_description,
        agentConfig: session.agent_config,
        enabledSkills,
        onProgress: (progress) => {
          logger.debug('Session progress', { sessionId, progress })
          this.emit('session_update', { sessionId, progress })
        },
        onAction: async (result: ActionResult) => {
          logger.info('Action executed', { sessionId, action: result.action, success: result.success })
          await this.storeAction(sessionId, result)
          this.emit('action_executed', { sessionId, result })
        },
        onScreenshot: (screenshot) => {
          logger.info('Screenshot received', { sessionId, hasScreenshot: !!screenshot, length: screenshot?.length })
          const activeSession = this.activeSessions.get(sessionId)
          if (activeSession) {
            activeSession.latestScreenshot = screenshot
          }
          this.emit('screenshot', { sessionId, screenshot })
        },
        onDomTree: (domTree) => {
          logger.info('DOM tree received', { sessionId, hasElements: !!domTree?.elements?.length })
          const activeSession = this.activeSessions.get(sessionId)
          if (activeSession) {
            activeSession.latestDomTree = domTree
          }
          this.emit('dom_tree', { sessionId, domTree })
        }
      }).then(async (results) => {
        logger.info('Session execution completed', { sessionId, actionCount: results.length })
        await this.completeSession(sessionId, results)
      }).catch(async (error) => {
        logger.error('Session execution failed', { sessionId, error: error.message })
        await this.failSession(sessionId, error.message)
      })

      logger.info('Session started with IntegratedAutomationService', { sessionId })
    } catch (error) {
      logger.error('Start session error', { sessionId, error })
      throw error
    }
  }

  async pauseSession(sessionId: string, supabaseClient?: SupabaseClient): Promise<void> {
    const activeSession = this.activeSessions.get(sessionId)
    if (!activeSession) {
      throw new Error('Session not active')
    }

    const supabase = this.getClient(sessionId, supabaseClient)

    automationService.pause(sessionId)
    await this.updateSessionStatus(sessionId, 'paused', supabase)

    this.emit('session_paused', { sessionId })
    logger.info('Session paused', { sessionId })
  }

  async resumeSession(sessionId: string, supabaseClient?: SupabaseClient): Promise<void> {
    const activeSession = this.activeSessions.get(sessionId)
    if (!activeSession) {
      throw new Error('Session not active')
    }

    const supabase = this.getClient(sessionId, supabaseClient)

    automationService.resume(sessionId)
    await this.updateSessionStatus(sessionId, 'active', supabase)

    this.emit('session_resumed', { sessionId })
    logger.info('Session resumed', { sessionId })
  }

  async cancelSession(sessionId: string, supabaseClient?: SupabaseClient): Promise<void> {
    const activeSession = this.activeSessions.get(sessionId)
    if (activeSession) {
      automationService.cancel(sessionId)
      this.activeSessions.delete(sessionId)
    }

    const supabase = this.getClient(sessionId, supabaseClient)
    await this.updateSessionStatus(sessionId, 'cancelled', supabase)

    this.emit('session_cancelled', { sessionId })
    logger.info('Session cancelled', { sessionId })
  }

  async deleteSession(sessionId: string, supabaseClient?: SupabaseClient): Promise<void> {
    const supabase = this.getClient(sessionId, supabaseClient)

    // Cancel if active
    const activeSession = this.activeSessions.get(sessionId)
    if (activeSession) {
      automationService.cancel(sessionId)
      this.activeSessions.delete(sessionId)
    }

    // Delete related actions first (foreign key constraint)
    const { error: actionsError } = await supabase
      .from('browser_actions')
      .delete()
      .eq('session_id', sessionId)

    if (actionsError) {
      logger.error('Delete session actions error', { sessionId, error: actionsError })
    }

    // Delete related chat messages
    const { error: messagesError } = await supabase
      .from('chat_messages')
      .delete()
      .eq('session_id', sessionId)

    if (messagesError) {
      logger.error('Delete session messages error', { sessionId, error: messagesError })
    }

    // Delete the session
    const { error } = await supabase
      .from('browser_sessions')
      .delete()
      .eq('id', sessionId)

    if (error) {
      logger.error('Delete session error', { sessionId, error })
      throw error
    }

    this.emit('session_deleted', { sessionId })
    logger.info('Session deleted', { sessionId })
  }

  getLatestScreenshot(sessionId: string): string | undefined {
    return this.activeSessions.get(sessionId)?.latestScreenshot
  }

  getLatestDomTree(sessionId: string): DomTree | undefined {
    return this.activeSessions.get(sessionId)?.latestDomTree
  }

  getLatencyMetrics(sessionId: string): LatencyMetrics | undefined {
    return automationService.getLatencyMetrics(sessionId)
  }

  async getSession(sessionId: string, supabaseClient?: SupabaseClient): Promise<BrowserSession | null> {
    const supabase = this.getClient(sessionId, supabaseClient)

    const { data, error } = await supabase
      .from('browser_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (error) {
      logger.error('Get session error', { sessionId, error })
      return null
    }

    return data as BrowserSession
  }

  async getUserSessions(userId: string, limit: number = 20, supabaseClient?: SupabaseClient): Promise<BrowserSession[]> {
    const supabase = supabaseClient || defaultSupabase

    const { data, error } = await supabase
      .from('browser_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      logger.error('Get user sessions error', { userId, error })
      return []
    }

    return data as BrowserSession[]
  }

  async getSessionActions(sessionId: string, supabaseClient?: SupabaseClient): Promise<any[]> {
    const supabase = this.getClient(sessionId, supabaseClient)

    const { data, error } = await supabase
      .from('browser_actions')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (error) {
      logger.error('Get session actions error', { sessionId, error })
      return []
    }

    return data
  }

  private async updateSessionStatus(
    sessionId: string,
    status: SessionStatus,
    supabaseClient?: SupabaseClient
  ): Promise<void> {
    const supabase = this.getClient(sessionId, supabaseClient)
    const updateData: any = { status, updated_at: new Date().toISOString() }

    if (status === 'active') {
      updateData.started_at = new Date().toISOString()
    } else if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      updateData.completed_at = new Date().toISOString()

      const activeSession = this.activeSessions.get(sessionId)
      if (activeSession) {
        const durationMs = Date.now() - activeSession.startedAt.getTime()
        updateData.duration_seconds = Math.floor(durationMs / 1000)
      }
    }

    const { error } = await supabase
      .from('browser_sessions')
      .update(updateData)
      .eq('id', sessionId)

    if (error) {
      logger.error('Update session status error', { sessionId, status, error })
    }
  }

  private async completeSession(sessionId: string, results: ActionResult[]): Promise<void> {
    const activeSession = this.activeSessions.get(sessionId)
    const userId = activeSession?.session.user_id
    const supabase = this.getClient(sessionId)

    await this.updateSessionStatus(sessionId, 'completed', supabase)

    await supabase
      .from('browser_sessions')
      .update({ actions_count: results.length })
      .eq('id', sessionId)

    this.activeSessions.delete(sessionId)

    if (userId) {
      await this.trackAnalytics(userId, 'session_completed', {
        session_id: sessionId,
        actions_count: results.length
      }, supabase)
    }

    this.emit('session_complete', { sessionId, results })
    logger.info('Session completed', { sessionId, actionsCount: results.length })
  }

  private async failSession(sessionId: string, errorMessage: string): Promise<void> {
    const activeSession = this.activeSessions.get(sessionId)
    const userId = activeSession?.session.user_id
    const supabase = this.getClient(sessionId)

    await supabase
      .from('browser_sessions')
      .update({
        status: 'failed',
        error_message: errorMessage,
        completed_at: new Date().toISOString()
      })
      .eq('id', sessionId)

    this.activeSessions.delete(sessionId)

    if (userId) {
      await this.trackAnalytics(userId, 'error_occurred', {
        session_id: sessionId,
        error: errorMessage
      }, supabase)
    }

    this.emit('session_failed', { sessionId, error: errorMessage })
    logger.error('Session failed', { sessionId, error: errorMessage })
  }

  private async storeAction(sessionId: string, result: ActionResult): Promise<void> {
    const supabase = this.getClient(sessionId)

    const { error } = await supabase
      .from('browser_actions')
      .insert({
        session_id: sessionId,
        action_type: result.action,
        target_selector: result.target,
        input_value: result.value,
        success: result.success,
        error_message: result.error,
        duration_ms: result.duration
      })

    if (error) {
      logger.error('Store action error', { sessionId, error })
    }
  }

  private async checkUserQuota(userId: string, supabaseClient?: SupabaseClient): Promise<boolean> {
    const supabase = supabaseClient || defaultSupabase

    const { data: profile } = await supabase
      .from('profiles')
      .select('usage_quota')
      .eq('id', userId)
      .single()

    if (!profile || !profile.usage_quota) {
      return true // Allow if no quota set
    }

    const quota = profile.usage_quota as any
    return quota.used_sessions < quota.monthly_sessions
  }

  private async trackAnalytics(
    userId: string,
    eventType: string,
    eventData: Record<string, any>,
    supabaseClient?: SupabaseClient
  ): Promise<void> {
    const supabase = supabaseClient || defaultSupabase

    await supabase
      .from('usage_analytics')
      .insert({
        user_id: userId,
        event_type: eventType,
        event_data: eventData
      })
  }

  getActiveSessionCount(): number {
    return this.activeSessions.size
  }

  isSessionActive(sessionId: string): boolean {
    return this.activeSessions.has(sessionId)
  }
}
