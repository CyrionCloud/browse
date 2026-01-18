import { useEffect, useRef, useCallback, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAppStore } from '@/store/useAppStore'
import type { WSEvent } from '@autobrowse/shared'

// Socket.IO uses HTTP for initial handshake, then upgrades to WebSocket
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:8000'

// Singleton socket instance
let globalSocket: Socket | null = null
let connectionCount = 0

export function useWebSocket() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const { setWsConnected, addWsEvent, updateSession } = useAppStore()

  useEffect(() => {
    connectionCount++

    // Create socket if it doesn't exist
    if (!globalSocket) {
      console.log('Creating new WebSocket connection to', WS_URL)
      globalSocket = io(WS_URL, {
        transports: ['websocket', 'polling'],  // Try websocket first, fallback to polling
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      })

      globalSocket.on('connect', () => {
        console.log('WebSocket connected:', globalSocket?.id)
        setConnected(true)
        setWsConnected(true)
      })

      globalSocket.on('disconnect', () => {
        console.log('WebSocket disconnected')
        setConnected(false)
        setWsConnected(false)
      })

      // Global event handlers for session state updates
      globalSocket.on('session_start', (event: WSEvent) => {
        console.log('Session started:', event)
        addWsEvent(event)
        updateSession(event.sessionId, { status: 'active', started_at: event.timestamp })
      })

      globalSocket.on('task_complete', (event: WSEvent) => {
        console.log('Task complete:', event)
        addWsEvent(event)
        updateSession(event.sessionId, {
          status: 'completed',
          completed_at: event.timestamp,
          result: event.data,
        })
      })

      globalSocket.on('error', (event: WSEvent) => {
        console.error('WebSocket error:', event)
        addWsEvent(event)
        if (event.sessionId) {
          updateSession(event.sessionId, {
            status: 'failed',
            error_message: event.data?.message,
          })
        }
      })

      globalSocket.on('paused', (event: WSEvent) => {
        console.log('Session paused:', event)
        addWsEvent(event)
        updateSession(event.sessionId, { status: 'paused' })
      })

      globalSocket.on('cancelled', (event: WSEvent) => {
        console.log('Session cancelled:', event)
        addWsEvent(event)
        updateSession(event.sessionId, { status: 'cancelled' })
      })

      // Action log events - for real-time step updates
      globalSocket.on('action_log', (event: any) => {
        console.log('Action log:', event)
        addWsEvent({
          type: 'action_log',
          sessionId: event.sessionId,
          timestamp: new Date().toISOString(),
          data: event.data
        })
      })

      // Session update events - for progress updates
      globalSocket.on('session_update', (event: any) => {
        console.log('Session update:', event)
        addWsEvent({
          type: 'session_update',
          sessionId: event.sessionId,
          timestamp: new Date().toISOString(),
          data: { progress: event.progress, step: event.step }
        })
      })

      // Session complete events - for final results
      globalSocket.on('session_complete', (event: any) => {
        console.log('Session complete:', event)
        addWsEvent({
          type: 'session_complete',
          sessionId: event.sessionId,
          timestamp: new Date().toISOString(),
          data: event.results
        })
        updateSession(event.sessionId, {
          status: 'completed',
          completed_at: new Date().toISOString(),
          result: event.results,
        })
      })
    }

    // Set the socket in state so component re-renders
    setSocket(globalSocket)
    if (globalSocket.connected) {
      setConnected(true)
    }

    // Also listen for connect events to update state
    const handleConnect = () => {
      setConnected(true)
    }
    const handleDisconnect = () => {
      setConnected(false)
    }

    globalSocket.on('connect', handleConnect)
    globalSocket.on('disconnect', handleDisconnect)

    return () => {
      connectionCount--
      globalSocket?.off('connect', handleConnect)
      globalSocket?.off('disconnect', handleDisconnect)

      // Only disconnect if no components are using the socket
      if (connectionCount === 0 && globalSocket) {
        console.log('Disconnecting WebSocket - no more listeners')
        globalSocket.disconnect()
        globalSocket = null
      }
    }
  }, [setWsConnected, addWsEvent, updateSession])

  const emit = useCallback((event: string, data: any) => {
    if (globalSocket?.connected) {
      globalSocket.emit(event, data)
    }
  }, [])

  return {
    socket,
    connected,
    emit,
  }
}
