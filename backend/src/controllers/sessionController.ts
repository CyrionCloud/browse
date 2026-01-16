import { Request, Response } from 'express'
import { SessionManager } from '../services/SessionManager'
import { logger } from '../utils/logger'
import { asyncHandler, BadRequestError, NotFoundError } from '../middleware/errorHandler'

let sessionManager: SessionManager

export function initSessionController(manager: SessionManager): void {
  sessionManager = manager
}

export const createSession = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id
  if (!userId) {
    throw new BadRequestError('User ID required')
  }

  const { task_description, agent_config } = req.body

  if (!task_description) {
    throw new BadRequestError('Task description required')
  }

  // Pass the authenticated Supabase client for RLS
  const session = await sessionManager.createSession(userId, task_description, agent_config, req.supabase)

  logger.info('Session created via API', { sessionId: session.id, userId })

  res.status(201).json({ data: session })
})

export const getSession = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params
  const sessionId = Array.isArray(id) ? id[0] : id

  const session = await sessionManager.getSession(sessionId, req.supabase)

  if (!session) {
    throw new NotFoundError('Session not found')
  }

  // Check if user owns this session
  if (session.user_id !== req.user?.id) {
    throw new NotFoundError('Session not found')
  }

  res.json({ data: session })
})

export const startSession = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params
  const sessionId = Array.isArray(id) ? id[0] : id

  const session = await sessionManager.getSession(sessionId, req.supabase)

  if (!session) {
    throw new NotFoundError('Session not found')
  }

  if (session.user_id !== req.user?.id) {
    throw new NotFoundError('Session not found')
  }

  await sessionManager.startSession(sessionId, req.supabase)

  logger.info('Session started via API', { sessionId })

  res.json({ message: 'Session started', sessionId })
})

export const pauseSession = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params
  const sessionId = Array.isArray(id) ? id[0] : id

  const session = await sessionManager.getSession(sessionId, req.supabase)

  if (!session) {
    throw new NotFoundError('Session not found')
  }

  if (session.user_id !== req.user?.id) {
    throw new NotFoundError('Session not found')
  }

  await sessionManager.pauseSession(sessionId, req.supabase)

  logger.info('Session paused via API', { sessionId })

  res.json({ message: 'Session paused', sessionId })
})

export const resumeSession = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params
  const sessionId = Array.isArray(id) ? id[0] : id

  const session = await sessionManager.getSession(sessionId, req.supabase)

  if (!session) {
    throw new NotFoundError('Session not found')
  }

  if (session.user_id !== req.user?.id) {
    throw new NotFoundError('Session not found')
  }

  await sessionManager.resumeSession(sessionId, req.supabase)

  logger.info('Session resumed via API', { sessionId })

  res.json({ message: 'Session resumed', sessionId })
})

export const cancelSession = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params
  const sessionId = Array.isArray(id) ? id[0] : id

  const session = await sessionManager.getSession(sessionId, req.supabase)

  if (!session) {
    throw new NotFoundError('Session not found')
  }

  if (session.user_id !== req.user?.id) {
    throw new NotFoundError('Session not found')
  }

  await sessionManager.cancelSession(sessionId, req.supabase)

  logger.info('Session cancelled via API', { sessionId })

  res.json({ message: 'Session cancelled', sessionId })
})

export const getUserSessions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.params
  const pathUserId = Array.isArray(userId) ? userId[0] : userId

  // Users can only get their own sessions
  if (pathUserId !== req.user?.id) {
    throw new NotFoundError('User not found')
  }

  const limit = parseInt(req.query.limit as string) || 20

  const sessions = await sessionManager.getUserSessions(pathUserId, limit, req.supabase)

  res.json({ data: sessions })
})

export const getSessionActions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params
  const sessionId = Array.isArray(id) ? id[0] : id

  const session = await sessionManager.getSession(sessionId, req.supabase)

  if (!session) {
    throw new NotFoundError('Session not found')
  }

  if (session.user_id !== req.user?.id) {
    throw new NotFoundError('Session not found')
  }

  const actions = await sessionManager.getSessionActions(sessionId, req.supabase)

  res.json({ data: actions })
})

export const deleteSession = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params
  const sessionId = Array.isArray(id) ? id[0] : id

  const session = await sessionManager.getSession(sessionId, req.supabase)

  if (!session) {
    throw new NotFoundError('Session not found')
  }

  if (session.user_id !== req.user?.id) {
    throw new NotFoundError('Session not found')
  }

  await sessionManager.deleteSession(sessionId, req.supabase)

  logger.info('Session deleted via API', { sessionId })

  res.json({ message: 'Session deleted', sessionId })
})
