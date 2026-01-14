'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SessionList } from '@/components/session/SessionList'
import { ChatInterface } from '@/components/chat/ChatInterface'
import { useAppStore } from '@/store/useAppStore'
import { sessionsApi, chatApi } from '@/lib/api'
import { PageLoader } from '@/components/LoadingState'
import { Card, Button, Badge } from '@/components/ui'
import {
  ArrowLeft,
  Play,
  Pause,
  Square,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { cn, formatDuration, formatDate } from '@/lib/utils'
import type { BrowserSession, SessionStatus } from '@autobrowse/shared'

const statusConfig: Record<SessionStatus, { icon: typeof CheckCircle2; color: string; label: string }> = {
  pending: { icon: Clock, color: 'warning', label: 'Pending' },
  active: { icon: Play, color: 'accent', label: 'Active' },
  paused: { icon: Pause, color: 'warning', label: 'Paused' },
  completed: { icon: CheckCircle2, color: 'success', label: 'Completed' },
  failed: { icon: XCircle, color: 'error', label: 'Failed' },
  cancelled: { icon: Square, color: 'default', label: 'Cancelled' },
}

export default function HistoryPage() {
  const router = useRouter()
  const {
    sessions,
    setSessions,
    currentSession,
    setCurrentSession,
    messages,
    setMessages,
    addMessage,
    updateSession,
    removeSession,
    isLoading,
    setLoading,
  } = useAppStore()
  const [isInitialLoading, setIsInitialLoading] = useState(true)

  useEffect(() => {
    loadSessions()
  }, [])

  useEffect(() => {
    if (currentSession) {
      loadMessages(currentSession.id)
    }
  }, [currentSession?.id])

  const loadSessions = async () => {
    try {
      const data = await sessionsApi.getAll()
      setSessions(data)
    } catch (error) {
      console.error('Failed to load sessions:', error)
    } finally {
      setIsInitialLoading(false)
    }
  }

  const loadMessages = async (sessionId: string) => {
    try {
      const data = await chatApi.getMessages(sessionId)
      setMessages(data)
    } catch (error) {
      console.error('Failed to load messages:', error)
    }
  }

  const handleStartSession = async (id: string) => {
    try {
      await sessionsApi.start(id)
      updateSession(id, { status: 'active', started_at: new Date().toISOString() })
    } catch (error) {
      console.error('Failed to start session:', error)
    }
  }

  const handlePauseSession = async (id: string) => {
    try {
      await sessionsApi.pause(id)
      updateSession(id, { status: 'paused' })
    } catch (error) {
      console.error('Failed to pause session:', error)
    }
  }

  const handleCancelSession = async (id: string) => {
    try {
      await sessionsApi.cancel(id)
      updateSession(id, { status: 'cancelled' })
    } catch (error) {
      console.error('Failed to cancel session:', error)
    }
  }

  const handleDeleteSession = async (id: string) => {
    try {
      await sessionsApi.delete(id)
      removeSession(id)
      if (currentSession?.id === id) {
        setCurrentSession(null)
        setMessages([])
      }
    } catch (error) {
      console.error('Failed to delete session:', error)
    }
  }

  const handleSelectSession = (session: BrowserSession) => {
    setCurrentSession(session)
  }

  const handleSendMessage = async (content: string) => {
    if (!currentSession) return

    setLoading(true)
    try {
      const { userMessage, assistantMessage } = await chatApi.sendMessage(
        currentSession.id,
        content
      )
      addMessage(userMessage)
      addMessage(assistantMessage)
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleBackToList = () => {
    setCurrentSession(null)
    setMessages([])
  }

  if (isInitialLoading) {
    return <PageLoader message="Loading sessions..." />
  }

  if (currentSession) {
    const status = statusConfig[currentSession.status]
    const StatusIcon = status.icon

    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" onClick={handleBackToList}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Sessions
          </Button>
        </div>

        <Card className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <StatusIcon
                    className={cn(
                      'h-5 w-5',
                      status.color === 'accent' && 'text-accent',
                      status.color === 'success' && 'text-emerald-400',
                      status.color === 'warning' && 'text-amber-400',
                      status.color === 'error' && 'text-error-muted',
                      status.color === 'default' && 'text-muted-foreground'
                    )}
                  />
                  <Badge variant={status.color as any}>{status.label}</Badge>
                  {currentSession.status === 'active' && (
                    <span className="flex items-center gap-1 text-xs text-accent">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      Running
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-semibold text-foreground">
                  {currentSession.task_description}
                </h2>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span>Created: {formatDate(currentSession.created_at)}</span>
                  {currentSession.duration_seconds && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDuration(currentSession.duration_seconds)}
                    </span>
                  )}
                  <span>{currentSession.actions_count} actions</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {currentSession.status === 'pending' && (
                  <Button
                    variant="accent"
                    size="sm"
                    onClick={() => handleStartSession(currentSession.id)}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start
                  </Button>
                )}
                {currentSession.status === 'active' && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePauseSession(currentSession.id)}
                    >
                      <Pause className="h-4 w-4 mr-2" />
                      Pause
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleCancelSession(currentSession.id)}
                    >
                      <Square className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </>
                )}
                {currentSession.status === 'paused' && (
                  <Button
                    variant="accent"
                    size="sm"
                    onClick={() => handleStartSession(currentSession.id)}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Resume
                  </Button>
                )}
              </div>
            </div>

            {currentSession.error_message && (
              <div className="mt-3 p-3 bg-error/10 border border-error/20">
                <div className="flex items-center gap-2 text-error-muted">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Error</span>
                </div>
                <p className="text-sm text-error-muted mt-1">
                  {currentSession.error_message}
                </p>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-hidden">
            <ChatInterface
              onSendMessage={handleSendMessage}
              disabled={currentSession.status === 'completed' || currentSession.status === 'cancelled'}
            />
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Session History</h1>
        <p className="text-sm text-muted-foreground mt-1">
          View and manage your automation sessions
        </p>
      </div>

      {sessions.length === 0 ? (
        <Card className="p-12 text-center">
          <Clock className="h-12 w-12 text-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No sessions yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Start by creating a new automation task
          </p>
          <Button variant="accent" onClick={() => router.push('/dashboard')}>
            Create New Task
          </Button>
        </Card>
      ) : (
        <SessionList
          onStartSession={handleStartSession}
          onPauseSession={handlePauseSession}
          onCancelSession={handleCancelSession}
          onDeleteSession={handleDeleteSession}
          onSelectSession={handleSelectSession}
        />
      )}
    </div>
  )
}
