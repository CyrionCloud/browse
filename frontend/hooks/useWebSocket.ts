import { useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAppStore } from '@/store/useAppStore'
import type { WSEvent } from '@autobrowse/shared'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000'

export function useWebSocket(sessionId?: string) {
  const socketRef = useRef<Socket | null>(null)
  const { setWsConnected, addWsEvent, updateSession, addMessage } = useAppStore()

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return

    const socket = io(WS_URL, {
      transports: ['websocket'],
      autoConnect: true,
    })

    socket.on('connect', () => {
      console.log('WebSocket connected:', socket.id)
      setWsConnected(true)

      if (sessionId) {
        socket.emit('subscribe', { sessionId })
      }
    })

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected')
      setWsConnected(false)
    })

    socket.on('session_start', (event: WSEvent) => {
      console.log('Session started:', event)
      addWsEvent(event)
      updateSession(event.sessionId, { status: 'active', started_at: event.timestamp })
    })

    socket.on('session_update', (event: WSEvent) => {
      console.log('Session update:', event)
      addWsEvent(event)
      updateSession(event.sessionId, event.data)
    })

    socket.on('action_executed', (event: WSEvent) => {
      console.log('Action executed:', event)
      addWsEvent(event)
    })

    socket.on('planning', (event: WSEvent) => {
      console.log('Planning:', event)
      addWsEvent(event)
    })

    socket.on('plan_ready', (event: WSEvent) => {
      console.log('Plan ready:', event)
      addWsEvent(event)
    })

    socket.on('action_complete', (event: WSEvent) => {
      console.log('Action complete:', event)
      addWsEvent(event)
    })

    socket.on('task_complete', (event: WSEvent) => {
      console.log('Task complete:', event)
      addWsEvent(event)
      updateSession(event.sessionId, {
        status: 'completed',
        completed_at: event.timestamp,
        result: event.data,
      })
    })

    socket.on('error', (event: WSEvent) => {
      console.error('WebSocket error:', event)
      addWsEvent(event)
      updateSession(event.sessionId, {
        status: 'failed',
        error_message: event.data.message,
      })
    })

    socket.on('paused', (event: WSEvent) => {
      console.log('Session paused:', event)
      addWsEvent(event)
      updateSession(event.sessionId, { status: 'paused' })
    })

    socket.on('cancelled', (event: WSEvent) => {
      console.log('Session cancelled:', event)
      addWsEvent(event)
      updateSession(event.sessionId, { status: 'cancelled' })
    })

    socketRef.current = socket
  }, [sessionId, setWsConnected, addWsEvent, updateSession])

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      if (sessionId) {
        socketRef.current.emit('unsubscribe', { sessionId })
      }
      socketRef.current.disconnect()
      socketRef.current = null
      setWsConnected(false)
    }
  }, [sessionId, setWsConnected])

  const emit = useCallback((event: string, data: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data)
    }
  }, [])

  useEffect(() => {
    connect()
    return () => disconnect()
  }, [connect, disconnect])

  return {
    socket: socketRef.current,
    connect,
    disconnect,
    emit,
  }
}
