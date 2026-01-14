import { EventEmitter } from 'events'
import { BrowserUseService } from './BrowserUseService'
import { supabase } from '../lib/supabase'
import { logger } from '../utils/logger'
import type { BrowserSession, AgentConfig, ActionResult, SessionStatus } from '@autobrowse/shared'

interface ActiveSession {
  session: BrowserSession
  browserUseService: BrowserUseService
  startedAt: Date
}

export class SessionManager extends EventEmitter {
  private activeSessions: Map<string, ActiveSession> = new Map()

  async createSession(
    userId: string,
    taskDescription: string,
    agentConfig?: Partial<AgentConfig>
  ): Promise<BrowserSession> {
    try {
      // Check user quota
      const hasQuota = await this.checkUserQuota(userId)
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
      await this.trackAnalytics(userId, 'session_created', { session_id: session.id })

      this.emit('session_created', session)

      return session as BrowserSession
    } catch (error) {
      logger.error('Create session error', { error })
      throw error
    }
  }

  async startSession(sessionId: string): Promise<void> {
    try {
      const { data: session, error } = await supabase
        .from('browser_sessions')
        .select('*')
        .eq('id', sessionId)
        .single()

      if (error || !session) {
        throw new Error('Session not found')
      }

      if (session.status !== 'pending' && session.status !== 'paused') {
        throw new Error(`Cannot start session with status: ${session.status}`)
      }

      // Update session status
      await this.updateSessionStatus(sessionId, 'active')

      const browserUseService = new BrowserUseService()

      // Store active session
      this.activeSessions.set(sessionId, {
        session: session as BrowserSession,
        browserUseService,
        startedAt: new Date()
      })

      this.emit('session_start', { sessionId, session })

      // Execute task
      browserUseService.on('progress', (progress) => {
        this.emit('session_update', { sessionId, progress })
      })

      browserUseService.on('action', async (result: ActionResult) => {
        await this.storeAction(sessionId, result)
        this.emit('action_executed', { sessionId, result })
      })

      browserUseService.on('complete', async (results: ActionResult[]) => {
        await this.completeSession(sessionId, results)
      })

      browserUseService.on('error', async (error: Error) => {
        await this.failSession(sessionId, error.message)
      })

      // Start task execution
      browserUseService.executeTask({
        taskDescription: session.task_description,
        agentConfig: session.agent_config
      }).catch(async (error) => {
        await this.failSession(sessionId, error.message)
      })

      logger.info('Session started', { sessionId })
    } catch (error) {
      logger.error('Start session error', { sessionId, error })
      throw error
    }
  }

  async pauseSession(sessionId: string): Promise<void> {
    const activeSession = this.activeSessions.get(sessionId)
    if (!activeSession) {
      throw new Error('Session not active')
    }

    activeSession.browserUseService.pause()
    await this.updateSessionStatus(sessionId, 'paused')

    this.emit('session_paused', { sessionId })
    logger.info('Session paused', { sessionId })
  }

  async resumeSession(sessionId: string): Promise<void> {
    const activeSession = this.activeSessions.get(sessionId)
    if (!activeSession) {
      throw new Error('Session not active')
    }

    activeSession.browserUseService.resume()
    await this.updateSessionStatus(sessionId, 'active')

    this.emit('session_resumed', { sessionId })
    logger.info('Session resumed', { sessionId })
  }

  async cancelSession(sessionId: string): Promise<void> {
    const activeSession = this.activeSessions.get(sessionId)
    if (activeSession) {
      activeSession.browserUseService.cancel()
      this.activeSessions.delete(sessionId)
    }

    await this.updateSessionStatus(sessionId, 'cancelled')

    this.emit('session_cancelled', { sessionId })
    logger.info('Session cancelled', { sessionId })
  }

  async getSession(sessionId: string): Promise<BrowserSession | null> {
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

  async getUserSessions(userId: string, limit: number = 20): Promise<BrowserSession[]> {
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

  async getSessionActions(sessionId: string): Promise<any[]> {
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

  private async updateSessionStatus(sessionId: string, status: SessionStatus): Promise<void> {
    const updateData: any = { status, updated_at: new Date().toISOString() }

    if (status === 'active') {
      updateData.started_at = new Date().toISOString()
    } else if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      updateData.completed_at = new Date().toISOString()

      // Calculate duration
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

    await this.updateSessionStatus(sessionId, 'completed')

    // Update actions count
    await supabase
      .from('browser_sessions')
      .update({ actions_count: results.length })
      .eq('id', sessionId)

    this.activeSessions.delete(sessionId)

    if (userId) {
      await this.trackAnalytics(userId, 'session_completed', {
        session_id: sessionId,
        actions_count: results.length
      })
    }

    this.emit('session_complete', { sessionId, results })
    logger.info('Session completed', { sessionId, actionsCount: results.length })
  }

  private async failSession(sessionId: string, errorMessage: string): Promise<void> {
    const activeSession = this.activeSessions.get(sessionId)
    const userId = activeSession?.session.user_id

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
      })
    }

    this.emit('session_failed', { sessionId, error: errorMessage })
    logger.error('Session failed', { sessionId, error: errorMessage })
  }

  private async storeAction(sessionId: string, result: ActionResult): Promise<void> {
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

  private async checkUserQuota(userId: string): Promise<boolean> {
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
    eventData: Record<string, any>
  ): Promise<void> {
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
