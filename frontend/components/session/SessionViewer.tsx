'use client'

import { useState, useEffect } from 'react'
import { useWebSocket } from '@/hooks/useWebSocket'
import { sessionsApi } from '@/lib/api'
import { cn, formatDuration, formatDate } from '@/lib/utils'
import { Card, Button, Badge } from '@/components/ui'
import {
  Play,
  Pause,
  Square,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Monitor,
  List,
  TreeDeciduous,
} from 'lucide-react'
import { ScreenshotViewer } from './ScreenshotViewer'
import { ActionLog } from './ActionLog'
import { DOMTreeViewer } from './DOMTreeViewer'
import { ProgressIndicator } from './ProgressIndicator'
import type { BrowserSession, BrowserAction, DomTree } from '@autobrowse/shared'

interface SessionViewerProps {
  session: BrowserSession
  onSessionUpdate: (session: BrowserSession) => void
}

const statusConfig = {
  pending: { icon: Clock, color: 'warning', label: 'Pending' },
  active: { icon: RefreshCw, color: 'accent', label: 'Active' },
  paused: { icon: Pause, color: 'warning', label: 'Paused' },
  completed: { icon: CheckCircle2, color: 'success', label: 'Completed' },
  failed: { icon: XCircle, color: 'error', label: 'Failed' },
  cancelled: { icon: Square, color: 'default', label: 'Cancelled' },
} as const

type ViewMode = 'screenshot' | 'actions' | 'dom'

export function SessionViewer({ session, onSessionUpdate }: SessionViewerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('screenshot')
  const [actions, setActions] = useState<BrowserAction[]>([])
  const [currentScreenshot, setCurrentScreenshot] = useState<string | null>(null)
  const [domTree, setDomTree] = useState<DomTree | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [totalSteps, setTotalSteps] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  const { socket, connected } = useWebSocket()

  useEffect(() => {
    if (session.id) {
      loadSessionData()
    }
  }, [session.id])

  // Subscribe to WebSocket events when socket is connected
  useEffect(() => {
    if (!socket || !connected || !session.id) return

    console.log('Subscribing to session events', { sessionId: session.id, connected })
    socket.emit('subscribe', { sessionId: session.id })

    const handleActionExecuted = (data: { sessionId: string; result?: { action: BrowserAction; screenshot?: string } }) => {
      console.log('action_executed received', data)
      if (data.result?.action) {
        setActions((prev) => [...prev, data.result!.action])
      }
      if (data.result?.screenshot) {
        setCurrentScreenshot(data.result.screenshot)
      }
      setCurrentStep((prev) => prev + 1)
    }

    const handleDomTree = (data: { sessionId: string; domTree: DomTree }) => {
      console.log('dom_tree received', { sessionId: data.sessionId, hasElements: !!data.domTree?.elements?.length })
      if (data.domTree) {
        setDomTree(data.domTree)
      }
    }

    const handleScreenshot = (data: { sessionId: string; screenshot: string }) => {
      console.log('screenshot received', { sessionId: data.sessionId, hasScreenshot: !!data.screenshot, length: data.screenshot?.length })
      if (data.screenshot) {
        setCurrentScreenshot(data.screenshot)
      }
    }

    const handleSessionUpdate = (data: { sessionId: string; session?: BrowserSession; progress?: any }) => {
      console.log('session_update received', data)
      if (data.session) {
        onSessionUpdate(data.session)
      }
    }

    const handleStepStarting = (data: { step: number; description: string }) => {
      console.log('step_starting received', data)
      setCurrentStep(data.step)
    }

    socket.on('action_executed', handleActionExecuted)
    socket.on('dom_tree', handleDomTree)
    socket.on('screenshot', handleScreenshot)
    socket.on('session_update', handleSessionUpdate)
    socket.on('step_starting', handleStepStarting)

    return () => {
      console.log('Unsubscribing from session events', { sessionId: session.id })
      socket.off('action_executed', handleActionExecuted)
      socket.off('dom_tree', handleDomTree)
      socket.off('screenshot', handleScreenshot)
      socket.off('session_update', handleSessionUpdate)
      socket.off('step_starting', handleStepStarting)
      socket.emit('unsubscribe', { sessionId: session.id })
    }
  }, [socket, connected, session.id, onSessionUpdate])

  const loadSessionData = async () => {
    try {
      const [actionsData] = await Promise.all([
        sessionsApi.getActions(session.id),
      ])
      setActions(actionsData)
      setTotalSteps(session.agent_config?.maxSteps || 50)
    } catch (error) {
      console.error('Failed to load session data:', error)
    }
  }

  const handleStart = async () => {
    try {
      setIsLoading(true)
      await sessionsApi.start(session.id)
      onSessionUpdate({ ...session, status: 'active', started_at: new Date().toISOString() })
    } catch (error) {
      console.error('Failed to start session:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePause = async () => {
    try {
      setIsLoading(true)
      await sessionsApi.pause(session.id)
      onSessionUpdate({ ...session, status: 'paused' })
    } catch (error) {
      console.error('Failed to pause session:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = async () => {
    try {
      setIsLoading(true)
      await sessionsApi.cancel(session.id)
      onSessionUpdate({ ...session, status: 'cancelled' })
    } catch (error) {
      console.error('Failed to cancel session:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const status = statusConfig[session.status]
  const StatusIcon = status.icon

  return (
    <div className="flex-1 flex flex-col gap-4 overflow-hidden">
      <Card className="p-4">
        <div className="flex items-start justify-between gap-3">
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
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              {session.task_description}
            </h2>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span>Created: {formatDate(session.created_at)}</span>
              {session.duration_seconds && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDuration(session.duration_seconds)}
                </span>
              )}
              <span>{actions.length} actions</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Debug: Show current status */}
            <span className="text-xs text-muted-foreground mr-2">
              [Status: {session.status}]
            </span>

            {session.status === 'pending' && (
              <Button
                variant="accent"
                size="sm"
                onClick={handleStart}
                disabled={isLoading}
              >
                <Play className="h-4 w-4 mr-2" />
                Start
              </Button>
            )}
            {session.status === 'active' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePause}
                  disabled={isLoading}
                >
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleCancel}
                  disabled={isLoading}
                >
                  <Square className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </>
            )}
            {session.status === 'paused' && (
              <Button
                variant="accent"
                size="sm"
                onClick={handleStart}
                disabled={isLoading}
              >
                <Play className="h-4 w-4 mr-2" />
                Resume
              </Button>
            )}
            {(session.status === 'completed' || session.status === 'failed' || session.status === 'cancelled') && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleStart}
                disabled={isLoading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Restart
              </Button>
            )}
          </div>
        </div>

        {totalSteps > 0 && (
          <div className="mt-4">
            <ProgressIndicator
              current={currentStep}
              total={totalSteps}
              status={session.status}
            />
          </div>
        )}
      </Card>

      <div className="flex items-center gap-2 px-1">
        <button
          onClick={() => setViewMode('screenshot')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            viewMode === 'screenshot'
              ? 'bg-accent/15 text-accent'
              : 'bg-surface text-muted-foreground hover:text-foreground'
          )}
        >
          <Monitor className="h-4 w-4" />
          Screenshot
        </button>
        <button
          onClick={() => setViewMode('actions')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            viewMode === 'actions'
              ? 'bg-accent/15 text-accent'
              : 'bg-surface text-muted-foreground hover:text-foreground'
          )}
        >
          <List className="h-4 w-4" />
          Action Log
        </button>
        <button
          onClick={() => setViewMode('dom')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            viewMode === 'dom'
              ? 'bg-accent/15 text-accent'
              : 'bg-surface text-muted-foreground hover:text-foreground'
          )}
        >
          <TreeDeciduous className="h-4 w-4" />
          DOM Tree
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        {viewMode === 'screenshot' && (
          <ScreenshotViewer
            screenshot={currentScreenshot}
            actions={actions}
            sessionStatus={session.status}
          />
        )}
        {viewMode === 'actions' && (
          <ActionLog
            actions={actions}
            sessionStatus={session.status}
            onSelectAction={(action) => {
              if (action.screenshot_url) {
                setCurrentScreenshot(action.screenshot_url)
                setViewMode('screenshot')
              }
            }}
          />
        )}
        {viewMode === 'dom' && (
          <DOMTreeViewer
            domTree={domTree}
            sessionStatus={session.status}
          />
        )}
      </div>
    </div>
  )
}
