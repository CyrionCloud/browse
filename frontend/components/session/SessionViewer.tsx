'use client'

import { useState, useEffect } from 'react'
import { useWebSocket } from '@/hooks/useWebSocket'
import { sessionsApi } from '@/lib/api'
import { useAppStore, type SessionDataEntry } from '@/store/useAppStore'
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
  FileText,
  GripVertical,
  History,
} from 'lucide-react'
import { ScreenshotViewer } from './ScreenshotViewer'
import { ActionLog } from './ActionLog'
import { DOMTreeViewer } from './DOMTreeViewer'
import { ProgressIndicator } from './ProgressIndicator'
import { ChatPanel } from './ChatPanel'
import { ResultsPanel } from './ResultsPanel'
import { TimelinePanel, type TimelineEntry } from './TimelinePanel'
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

type ViewMode = 'screenshot' | 'actions' | 'dom' | 'results' | 'timeline'

export function SessionViewer({ session, onSessionUpdate }: SessionViewerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('screenshot')
  const { sessionData, updateSessionData } = useAppStore()

  // Get data from store with defaults
  const currentSessionData = sessionData[session.id] || { screenshot: null, actions: [], timeline: [] }
  const actions = currentSessionData.actions
  const timelineEntries = currentSessionData.timeline.map(entry => ({
    ...entry,
    timestamp: new Date(entry.timestamp) // Rehydrate Date object
  }))
  const currentScreenshot = currentSessionData.screenshot

  const [domTree, setDomTree] = useState<DomTree | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [totalSteps, setTotalSteps] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [chatWidth, setChatWidth] = useState(350)
  const [isResizing, setIsResizing] = useState(false)

  const { socket, connected } = useWebSocket()

  useEffect(() => {
    if (session.id) {
      loadSessionData()
    }
  }, [session.id])

  // Subscribe to WebSocket events when socket is connected
  useEffect(() => {
    console.log('=== SessionViewer useEffect ===', {
      hasSocket: !!socket,
      connected,
      sessionId: session.id,
      willSubscribe: !!(socket && connected && session.id)
    })

    if (!socket || !connected || !session.id) {
      console.log('Skipping subscription - conditions not met')
      return
    }

    console.log('Subscribing to session events', { sessionId: session.id, connected })
    socket.emit('subscribe', { sessionId: session.id })

    const handleActionExecuted = (data: { sessionId: string; result?: { action: BrowserAction; screenshot?: string } }) => {
      if (data.sessionId !== session.id) return
      console.log('action_executed received', data)

      if (data.result?.action || data.result?.screenshot) {
        updateSessionData(session.id, (current) => {
          const updates: Partial<SessionDataEntry> = {}
          if (data.result?.action) {
            updates.actions = [...current.actions, data.result.action]
          }
          if (data.result?.screenshot) {
            updates.screenshot = data.result.screenshot
          }
          return updates
        })
      }
      setCurrentStep((prev) => prev + 1)
    }

    // Handle action_log from new backend
    const handleActionLog = (data: { sessionId: string; step: number; maxSteps?: number; data: any }) => {
      console.log('=== ACTION_LOG EVENT ===', { receivedSessionId: data.sessionId, currentSessionId: session.id, match: data.sessionId === session.id })
      if (data.sessionId !== session.id) {
        console.log('Skipping action_log - session mismatch')
        return
      }
      console.log('Processing action_log for step', data.step, data)

      // Update step count
      setCurrentStep(data.step)
      if (data.maxSteps) {
        setTotalSteps(data.maxSteps)
      }

      // Convert to BrowserAction format
      const stepData = data.data
      const newAction: BrowserAction = {
        id: `step-${data.step}`,
        session_id: session.id,
        action_type: stepData?.action?.[0] ? Object.keys(stepData.action[0])[0] as any || 'navigate' : 'navigate',
        target_description: stepData?.goal || stepData?.memory || `Step ${data.step}`,
        input_value: stepData?.url || undefined,
        output_value: stepData?.result || undefined,
        success: true,
        duration_ms: 0,
        metadata: stepData,
        created_at: new Date().toISOString()
      }

      console.log('Adding new action to state:', newAction)

      // Create timeline entry
      const timelineEntry: TimelineEntry = {
        id: `timeline-${data.step}-${Date.now()}`,
        timestamp: new Date(),
        step: data.step,
        goal: stepData?.goal,
        action: stepData?.action,
        evaluation: stepData?.evaluation,
        memory: stepData?.memory,
        result: stepData?.result,
        url: stepData?.url,
      }

      // Update store using functional pattern to prevent race conditions
      updateSessionData(session.id, (current) => ({
        actions: [...current.actions, newAction],
        timeline: [...current.timeline, timelineEntry]
      }))
    }

    const handleDomTree = (data: { sessionId: string; domTree: DomTree }) => {
      if (data.sessionId !== session.id) return
      console.log('dom_tree received', { sessionId: data.sessionId, hasElements: !!data.domTree?.elements?.length })
      if (data.domTree) {
        setDomTree(data.domTree)
      }
    }

    const handleScreenshot = (data: { sessionId: string; screenshot: string }) => {
      if (data.sessionId !== session.id) return
      console.log('screenshot received', { sessionId: data.sessionId, hasScreenshot: !!data.screenshot, length: data.screenshot?.length })
      if (data.screenshot) {
        // Update store with functional pattern
        updateSessionData(session.id, (current) => {
          const updatedTimeline = [...current.timeline]
          if (updatedTimeline.length > 0) {
            updatedTimeline[updatedTimeline.length - 1] = {
              ...updatedTimeline[updatedTimeline.length - 1],
              screenshot: data.screenshot
            }
          }

          return {
            screenshot: data.screenshot,
            timeline: updatedTimeline
          }
        })
      }
    }

    const handleSessionUpdate = (data: { sessionId: string; session?: BrowserSession; progress?: any; step?: number; maxSteps?: number }) => {
      if (data.sessionId !== session.id) return
      console.log('session_update received', data)
      if (data.session) {
        onSessionUpdate(data.session)
      }
      if (data.step) {
        setCurrentStep(data.step)
      }
      if (data.maxSteps) {
        setTotalSteps(data.maxSteps)
      }
    }

    const handleStepStarting = (data: { sessionId?: string; step: number; description: string }) => {
      if (data.sessionId && data.sessionId !== session.id) return
      console.log('step_starting received', data)
      setCurrentStep(data.step)
    }

    // Handler for reconnection - re-subscribe to the session room
    const handleReconnect = () => {
      console.log('Socket reconnected - re-subscribing to session', session.id)
      socket.emit('subscribe', { sessionId: session.id })
    }

    socket.on('action_executed', handleActionExecuted)
    socket.on('action_log', handleActionLog)
    socket.on('dom_tree', handleDomTree)
    socket.on('screenshot', handleScreenshot)
    socket.on('session_update', handleSessionUpdate)
    socket.on('step_starting', handleStepStarting)
    socket.on('connect', handleReconnect)

    return () => {
      console.log('Unsubscribing from session events', { sessionId: session.id })
      socket.off('action_executed', handleActionExecuted)
      socket.off('action_log', handleActionLog)
      socket.off('dom_tree', handleDomTree)
      socket.off('screenshot', handleScreenshot)
      socket.off('session_update', handleSessionUpdate)
      socket.off('step_starting', handleStepStarting)
      socket.off('connect', handleReconnect)
      socket.emit('unsubscribe', { sessionId: session.id })
    }
  }, [socket, connected, session.id, onSessionUpdate])

  const loadSessionData = async () => {
    try {
      if (actions.length === 0) {
        const [actionsData] = await Promise.all([
          sessionsApi.getActions(session.id),
        ])
        updateSessionData(session.id, { actions: actionsData })
      }
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

      {/* Main content area: Browser (left) + Chat (right) - horizontal layout */}
      <div
        className="flex-1 flex gap-0 overflow-hidden"
        onMouseMove={(e) => {
          if (isResizing) {
            const containerRect = e.currentTarget.getBoundingClientRect()
            const newWidth = containerRect.right - e.clientX
            setChatWidth(Math.max(250, Math.min(600, newWidth)))
          }
        }}
        onMouseUp={() => setIsResizing(false)}
        onMouseLeave={() => setIsResizing(false)}
      >
        {/* Left: Browser View with tabs */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* View Mode Tabs */}
          <div className="flex items-center gap-2 px-1 mb-2">
            <button
              onClick={() => setViewMode('screenshot')}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                viewMode === 'screenshot'
                  ? 'bg-accent/15 text-accent'
                  : 'bg-surface text-muted-foreground hover:text-foreground'
              )}
            >
              <Monitor className="h-3.5 w-3.5" />
              Screenshot
            </button>
            <button
              onClick={() => setViewMode('actions')}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                viewMode === 'actions'
                  ? 'bg-accent/15 text-accent'
                  : 'bg-surface text-muted-foreground hover:text-foreground'
              )}
            >
              <List className="h-3.5 w-3.5" />
              Action Log
            </button>
            <button
              onClick={() => setViewMode('dom')}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                viewMode === 'dom'
                  ? 'bg-accent/15 text-accent'
                  : 'bg-surface text-muted-foreground hover:text-foreground'
              )}
            >
              <TreeDeciduous className="h-3.5 w-3.5" />
              DOM Tree
            </button>
            <button
              onClick={() => setViewMode('results')}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                viewMode === 'results'
                  ? 'bg-accent/15 text-accent'
                  : 'bg-surface text-muted-foreground hover:text-foreground'
              )}
            >
              <FileText className="h-3.5 w-3.5" />
              Results
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                viewMode === 'timeline'
                  ? 'bg-accent/15 text-accent'
                  : 'bg-surface text-muted-foreground hover:text-foreground'
              )}
            >
              <History className="h-3.5 w-3.5" />
              Timeline
            </button>
          </div>

          {/* Browser Content */}
          <div className="flex-1 overflow-hidden">
            {viewMode === 'screenshot' && (
              <ScreenshotViewer
                screenshot={currentScreenshot}
                actions={actions}
                sessionStatus={session.status}
                currentUrl={domTree?.url || 'about:blank'}
                pageTitle={domTree?.title || session.task_description?.slice(0, 30)}
              />
            )}
            {viewMode === 'actions' && (
              <ActionLog
                actions={actions}
                sessionStatus={session.status}
                onSelectAction={(action) => {
                  if (action.screenshot_url) {
                    updateSessionData(session.id, { screenshot: action.screenshot_url })
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
            {viewMode === 'results' && (
              <ResultsPanel
                actions={actions}
                sessionStatus={session.status}
                taskDescription={session.task_description}
                result={session.result}
                className="h-full"
              />
            )}
            {viewMode === 'timeline' && (
              <TimelinePanel
                entries={timelineEntries}
                sessionStatus={session.status}
                onEntryClick={(entry) => {
                  if (entry.screenshot) {
                    updateSessionData(session.id, { screenshot: entry.screenshot })
                    setViewMode('screenshot')
                  }
                }}
              />
            )}
          </div>
        </div>

        {/* Resizable Divider */}
        <div
          className={cn(
            'w-1 flex-shrink-0 cursor-col-resize group hover:bg-accent/30 transition-colors flex items-center justify-center',
            isResizing && 'bg-accent/50'
          )}
          onMouseDown={(e) => {
            e.preventDefault()
            setIsResizing(true)
          }}
        >
          <GripVertical className="h-6 w-3 text-muted-foreground group-hover:text-accent opacity-50 group-hover:opacity-100" />
        </div>

        {/* Right: Chat Panel - same height as browser */}
        <div style={{ width: chatWidth }} className="flex-shrink-0">
          <ChatPanel
            sessionId={session.id}
            sessionStatus={session.status}
            className="h-full"
          />
        </div>
      </div>
    </div>
  )
}
