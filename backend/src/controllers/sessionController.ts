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

  const session = await sessionManager.createSession(userId, task_description, agent_config)

  logger.info('Session created via API', { sessionId: session.id, userId })

  res.status(201).json({ data: session })
})

export const getSession = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params

  const session = await sessionManager.getSession(id)

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

  const session = await sessionManager.getSession(id)

  if (!session) {
    throw new NotFoundError('Session not found')
  }

  if (session.user_id !== req.user?.id) {
    throw new NotFoundError('Session not found')
  }

  await sessionManager.startSession(id)

  logger.info('Session started via API', { sessionId: id })

  res.json({ message: 'Session started', sessionId: id })
})

export const pauseSession = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params

  const session = await sessionManager.getSession(id)

  if (!session) {
    throw new NotFoundError('Session not found')
  }

  if (session.user_id !== req.user?.id) {
    throw new NotFoundError('Session not found')
  }

  await sessionManager.pauseSession(id)

  logger.info('Session paused via API', { sessionId: id })

  res.json({ message: 'Session paused', sessionId: id })
})

export const resumeSession = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params

  const session = await sessionManager.getSession(id)

  if (!session) {
    throw new NotFoundError('Session not found')
  }

  if (session.user_id !== req.user?.id) {
    throw new NotFoundError('Session not found')
  }

  await sessionManager.resumeSession(id)

  logger.info('Session resumed via API', { sessionId: id })

  res.json({ message: 'Session resumed', sessionId: id })
})

export const cancelSession = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params

  const session = await sessionManager.getSession(id)

  if (!session) {
    throw new NotFoundError('Session not found')
  }

  if (session.user_id !== req.user?.id) {
    throw new NotFoundError('Session not found')
  }

  await sessionManager.cancelSession(id)

  logger.info('Session cancelled via API', { sessionId: id })

  res.json({ message: 'Session cancelled', sessionId: id })
})

export const getUserSessions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.params

  // Users can only get their own sessions
  if (userId !== req.user?.id) {
    throw new NotFoundError('User not found')
  }

  const limit = parseInt(req.query.limit as string) || 20

  const sessions = await sessionManager.getUserSessions(userId, limit)

  res.json({ data: sessions })
})

export const getSessionActions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params

  const session = await sessionManager.getSession(id)

  if (!session) {
    throw new NotFoundError('Session not found')
  }

  if (session.user_id !== req.user?.id) {
    throw new NotFoundError('Session not found')
  }

  const actions = await sessionManager.getSessionActions(id)

  res.json({ data: actions })
})
