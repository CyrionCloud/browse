import { Server as HTTPServer } from 'http'
import { Server, Socket } from 'socket.io'
import { SessionManager } from './SessionManager'
import { logger } from '../utils/logger'

interface SocketData {
  userId?: string
  subscribedSessions: Set<string>
}

export class WebSocketServer {
  private io: Server
  private sessionManager: SessionManager
  private socketData: Map<string, SocketData> = new Map()

  constructor(httpServer: HTTPServer, sessionManager: SessionManager) {
    this.sessionManager = sessionManager

    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
        methods: ['GET', 'POST'],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000
    })

    this.setupEventListeners()
    this.setupSessionManagerEvents()

    logger.info('WebSocket server initialized')
  }

  private setupEventListeners(): void {
    this.io.on('connection', (socket: Socket) => {
      logger.info('Client connected', { socketId: socket.id })

      // Initialize socket data
      this.socketData.set(socket.id, {
        subscribedSessions: new Set()
      })

      // Handle authentication
      socket.on('authenticate', (data: { userId: string }) => {
        const socketData = this.socketData.get(socket.id)
        if (socketData) {
          socketData.userId = data.userId
          logger.debug('Client authenticated', { socketId: socket.id, userId: data.userId })
        }
      })

      // Handle session subscription (support both string and object format)
      socket.on('subscribe', (data: string | { sessionId: string }) => {
        const sessionId = typeof data === 'string' ? data : data.sessionId
        const socketData = this.socketData.get(socket.id)
        if (socketData && sessionId) {
          socketData.subscribedSessions.add(sessionId)
          socket.join(`session:${sessionId}`)
          logger.info('Client subscribed to session', { socketId: socket.id, sessionId })
        }
      })

      // Handle session unsubscription (support both string and object format)
      socket.on('unsubscribe', (data: string | { sessionId: string }) => {
        const sessionId = typeof data === 'string' ? data : data.sessionId
        const socketData = this.socketData.get(socket.id)
        if (socketData && sessionId) {
          socketData.subscribedSessions.delete(sessionId)
          socket.leave(`session:${sessionId}`)
          logger.info('Client unsubscribed from session', { socketId: socket.id, sessionId })
        }
      })

      // Handle disconnect
      socket.on('disconnect', (reason: string) => {
        this.socketData.delete(socket.id)
        logger.info('Client disconnected', { socketId: socket.id, reason })
      })

      // Handle errors
      socket.on('error', (error: Error) => {
        logger.error('Socket error', { socketId: socket.id, error: error.message })
      })
    })
  }

  private setupSessionManagerEvents(): void {
    this.sessionManager.on('session_created', (session) => {
      logger.info('WS: session_created event', { sessionId: session.id, userId: session.user_id })
      this.emitToUser(session.user_id, 'session_created', session)
    })

    this.sessionManager.on('session_start', ({ sessionId, session }) => {
      logger.info('WS: session_start event', { sessionId, status: session?.status })
      this.emitToSession(sessionId, 'session_start', { sessionId, session })
    })

    this.sessionManager.on('session_update', ({ sessionId, progress }) => {
      logger.info('WS: session_update event', { sessionId, progress })
      this.emitToSession(sessionId, 'session_update', { sessionId, progress })
    })

    this.sessionManager.on('action_executed', ({ sessionId, result }) => {
      logger.info('WS: action_executed event', { sessionId, action: result?.action, success: result?.success })
      this.emitToSession(sessionId, 'action_executed', { sessionId, result })
    })

    // Forward screenshot events to clients
    this.sessionManager.on('screenshot', ({ sessionId, screenshot }) => {
      logger.info('WS: screenshot event', { sessionId, hasScreenshot: !!screenshot, length: screenshot?.length })
      this.emitToSession(sessionId, 'screenshot', { sessionId, screenshot })
    })

    // Forward DOM tree events to clients
    this.sessionManager.on('dom_tree', ({ sessionId, domTree }) => {
      logger.info('WS: dom_tree event', { sessionId, hasElements: !!domTree?.elements?.length })
      this.emitToSession(sessionId, 'dom_tree', { sessionId, domTree })
    })

    this.sessionManager.on('session_complete', ({ sessionId, results }) => {
      logger.info('WS: session_complete event', { sessionId, actionCount: results?.length })
      this.emitToSession(sessionId, 'task_complete', { sessionId, results })
    })

    this.sessionManager.on('session_failed', ({ sessionId, error }) => {
      logger.error('WS: session_failed event', { sessionId, error })
      this.emitToSession(sessionId, 'error', { sessionId, error })
    })

    this.sessionManager.on('session_paused', ({ sessionId }) => {
      logger.info('WS: session_paused event', { sessionId })
      this.emitToSession(sessionId, 'paused', { sessionId })
    })

    this.sessionManager.on('session_resumed', ({ sessionId }) => {
      logger.info('WS: session_resumed event', { sessionId })
      this.emitToSession(sessionId, 'session_update', { sessionId, status: 'active' })
    })

    this.sessionManager.on('session_cancelled', ({ sessionId }) => {
      logger.info('WS: session_cancelled event', { sessionId })
      this.emitToSession(sessionId, 'cancelled', { sessionId })
    })
  }

  private emitToSession(sessionId: string, event: string, data: any): void {
    this.io.to(`session:${sessionId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    })
    logger.debug('Emitted to session', { sessionId, event })
  }

  private emitToUser(userId: string, event: string, data: any): void {
    // Find all sockets for this user
    for (const [socketId, socketData] of this.socketData) {
      if (socketData.userId === userId) {
        this.io.to(socketId).emit(event, {
          ...data,
          timestamp: new Date().toISOString()
        })
      }
    }
    logger.debug('Emitted to user', { userId, event })
  }

  broadcast(event: string, data: any): void {
    this.io.emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    })
    logger.debug('Broadcast event', { event })
  }

  getConnectedClients(): number {
    return this.io.engine.clientsCount
  }

  getIO(): Server {
    return this.io
  }
}
