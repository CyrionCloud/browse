import express, { Express } from 'express'
import { createServer } from 'http'
import cors from 'cors'
import dotenv from 'dotenv'

// Load environment variables first
dotenv.config()

import { logger } from './utils/logger'
import { SessionManager } from './services/SessionManager'
import { WebSocketServer } from './services/WebSocketServer'
import { authenticateUser } from './middleware/auth'
import { rateLimiter, strictRateLimiter } from './middleware/rateLimiter'
import { errorHandler, notFoundHandler } from './middleware/errorHandler'
import {
  initSessionController,
  createSession,
  getSession,
  startSession,
  pauseSession,
  resumeSession,
  cancelSession,
  getUserSessions,
  getSessionActions,
  deleteSession
} from './controllers/sessionController'
import { sendMessage, getMessages } from './controllers/chatController'
import {
  getSkills,
  getSkill,
  getUserSkills,
  toggleSkill,
  updateSkillConfig
} from './controllers/skillsController'
import {
  startBenchmark,
  getBenchmarkStatus,
  stopBenchmark,
  getBenchmarkTasks,
  waitForBenchmark
} from './controllers/benchmarkController'

const app: Express = express()
const httpServer = createServer(app)
const PORT = process.env.PORT || 4000

// Initialize services
const sessionManager = new SessionManager()
initSessionController(sessionManager)

// Initialize WebSocket server
const wsServer = new WebSocketServer(httpServer, sessionManager)

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Apply rate limiting to all routes
app.use(rateLimiter())

import { performHealthCheck } from './utils/health'

// Health check endpoint (no auth required)
app.get('/health', async (_req, res) => {
  const result = await performHealthCheck()
  const statusCode = result.status === 'healthy' ? 200 : result.status === 'degraded' ? 200 : 503
  res.status(statusCode).json(result)
})

// Debug endpoint to test auth
app.get('/api/debug/auth', authenticateUser, async (req, res) => {
  const userId = req.user?.id
  const supabase = req.supabase

  if (!supabase) {
    return res.json({ error: 'No authenticated client', user: req.user })
  }

  // Test querying with the authenticated client
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  const { data: sessions, error: sessionsError } = await supabase
    .from('browser_sessions')
    .select('id, status, task_description')
    .limit(5)

  res.json({
    user: req.user,
    profile: profile || null,
    profileError: profileError?.message || null,
    sessions: sessions || [],
    sessionsError: sessionsError?.message || null
  })
})

// API Routes

// Session routes
app.post('/api/sessions', authenticateUser, strictRateLimiter, createSession)
app.get('/api/sessions/:id', authenticateUser, getSession)
app.post('/api/sessions/:id/start', authenticateUser, strictRateLimiter, startSession)
app.post('/api/sessions/:id/pause', authenticateUser, pauseSession)
app.post('/api/sessions/:id/resume', authenticateUser, resumeSession)
app.post('/api/sessions/:id/cancel', authenticateUser, cancelSession)
app.get('/api/sessions/:id/actions', authenticateUser, getSessionActions)
app.get('/api/sessions/:id/messages', authenticateUser, getMessages)
app.delete('/api/sessions/:id', authenticateUser, deleteSession)
app.get('/api/users/:userId/sessions', authenticateUser, getUserSessions)

// Chat routes
app.post('/api/chat', authenticateUser, strictRateLimiter, sendMessage)

// Skills routes
app.get('/api/skills', getSkills)
app.get('/api/skills/:id', getSkill)
app.get('/api/users/:userId/skills', authenticateUser, getUserSkills)
app.put('/api/skills/:id/toggle', authenticateUser, toggleSkill)
app.put('/api/skills/:id/config', authenticateUser, updateSkillConfig)

// Benchmark routes (GAIA benchmark suite)
app.post('/api/benchmark/start', authenticateUser, startBenchmark)
app.get('/api/benchmark/status', authenticateUser, getBenchmarkStatus)
app.post('/api/benchmark/stop', authenticateUser, stopBenchmark)
app.get('/api/benchmark/tasks', authenticateUser, getBenchmarkTasks)
app.get('/api/benchmark/wait', authenticateUser, waitForBenchmark)

// Error handling
app.use(notFoundHandler)
app.use(errorHandler)

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info('Received shutdown signal, closing server...')

  httpServer.close(() => {
    logger.info('HTTP server closed')
    process.exit(0)
  })

  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout')
    process.exit(1)
  }, 10000)
}

process.on('SIGTERM', gracefulShutdown)
process.on('SIGINT', gracefulShutdown)

// Start server
httpServer.listen(PORT, () => {
  logger.info(`Server started on port ${PORT}`)
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`)
  logger.info(`CORS origins: ${process.env.ALLOWED_ORIGINS || 'http://localhost:3000'}`)
})

export { app, httpServer, sessionManager, wsServer }
