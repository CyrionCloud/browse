import { Request, Response } from 'express'
import { AgentService } from '../services/AgentService'
import { supabase } from '../lib/supabase'
import { logger } from '../utils/logger'
import { asyncHandler, BadRequestError, NotFoundError } from '../middleware/errorHandler'

// Store agent instances per session
const sessionAgents: Map<string, AgentService> = new Map()

export const sendMessage = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id
  if (!userId) {
    throw new BadRequestError('User ID required')
  }

  const { session_id, content } = req.body

  if (!session_id || !content) {
    throw new BadRequestError('Session ID and content required')
  }

  // Verify session belongs to user
  const { data: session, error: sessionError } = await supabase
    .from('browser_sessions')
    .select('*')
    .eq('id', session_id)
    .eq('user_id', userId)
    .single()

  if (sessionError || !session) {
    throw new NotFoundError('Session not found')
  }

  // Store user message
  const { data: userMessage, error: msgError } = await supabase
    .from('chat_messages')
    .insert({
      session_id,
      user_id: userId,
      role: 'user',
      content
    })
    .select()
    .single()

  if (msgError) {
    logger.error('Failed to store user message', { error: msgError })
    throw new Error('Failed to store message')
  }

  // Get or create agent for this session
  let agent = sessionAgents.get(session_id)
  if (!agent) {
    agent = new AgentService(session.agent_config)
    sessionAgents.set(session_id, agent)
  }

  // Get AI response
  const response = await agent.chat(content)

  // Store assistant message
  const { data: assistantMessage, error: assistantError } = await supabase
    .from('chat_messages')
    .insert({
      session_id,
      user_id: userId,
      role: 'assistant',
      content: response
    })
    .select()
    .single()

  if (assistantError) {
    logger.error('Failed to store assistant message', { error: assistantError })
  }

  logger.info('Chat message processed', { sessionId: session_id, userId })

  res.json({
    data: {
      userMessage,
      assistantMessage
    }
  })
})

export const getMessages = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id
  if (!userId) {
    throw new BadRequestError('User ID required')
  }

  const { id: sessionId } = req.params

  // Verify session belongs to user
  const { data: session, error: sessionError } = await supabase
    .from('browser_sessions')
    .select('id, user_id')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .single()

  if (sessionError || !session) {
    throw new NotFoundError('Session not found')
  }

  const limit = parseInt(req.query.limit as string) || 50
  const offset = parseInt(req.query.offset as string) || 0

  const { data: messages, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1)

  if (error) {
    logger.error('Failed to get messages', { sessionId, error })
    throw new Error('Failed to get messages')
  }

  res.json({ data: messages })
})

// Clean up agent when session ends
export function cleanupSessionAgent(sessionId: string): void {
  const agent = sessionAgents.get(sessionId)
  if (agent) {
    agent.clearHistory()
    sessionAgents.delete(sessionId)
    logger.debug('Session agent cleaned up', { sessionId })
  }
}
