'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, MousePointer, Clock, Navigation, Eye, Scroll, Type, Download, Upload, ChevronDown, ChevronRight, CheckCircle2, XCircle, Loader2, Camera } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui'
import type { BrowserAction, ActionType, SessionStatus } from '@autobrowse/shared'

interface ActionLogProps {
  actions: BrowserAction[]
  sessionStatus: SessionStatus
  onSelectAction: (action: BrowserAction) => void
}

const actionIcons: Partial<Record<ActionType, typeof MousePointer>> = {
  navigate: Navigation,
  click: MousePointer,
  type: Type,
  scroll: Scroll,
  extract: Eye,
  wait: Clock,
  screenshot: Camera,
  hover: MousePointer,
  select: MousePointer,
  upload: Type,
  download: Type,
  highlight: Eye,
  drag: MousePointer,
}

// Extract a human-readable action name from the action data
const getActionDisplayName = (action: BrowserAction): string => {
  // Check if metadata has action array with action names
  if (action.metadata?.action) {
    const actionData = action.metadata.action
    if (Array.isArray(actionData) && actionData.length > 0) {
      const firstAction = actionData[0]
      if (typeof firstAction === 'object') {
        // Get first key from action object (e.g., 'go_to_url', 'click_element_by_index')
        const actionKey = Object.keys(firstAction)[0]
        if (actionKey) {
          // Convert snake_case to Title Case with emoji
          return actionKey.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
        }
      }
    }
  }
  // Fallback to action type
  return action.action_type.charAt(0).toUpperCase() + action.action_type.slice(1)
}

export function ActionLog({ actions, sessionStatus, onSelectAction }: ActionLogProps) {
  const [expandedActions, setExpandedActions] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current && sessionStatus === 'active') {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [actions.length, sessionStatus])

  const toggleExpand = (actionId: string) => {
    setExpandedActions((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(actionId)) {
        newSet.delete(actionId)
      } else {
        newSet.add(actionId)
      }
      return newSet
    })
  }

  const filteredActions = actions.filter((action) => {
    if (!filter) return true
    const searchStr = filter.toLowerCase()
    return (
      action.action_type.toLowerCase().includes(searchStr) ||
      action.target_description?.toLowerCase().includes(searchStr) ||
      action.target_selector?.toLowerCase().includes(searchStr)
    )
  })

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter actions..."
            className="w-full h-9 pl-10 pr-4 bg-surface-elevated border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <span>{filteredActions.length} actions</span>
          {sessionStatus === 'active' && (
            <span className="flex items-center gap-1 text-accent">
              <Loader2 className="h-3 w-3 animate-spin" />
              Recording...
            </span>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {filteredActions.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-4">
            <Clock className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm font-medium">No actions recorded</p>
            <p className="text-xs mt-1 text-center">
              {sessionStatus === 'pending' && 'Start session to begin recording'}
              {sessionStatus === 'active' && 'Waiting for first action...'}
              {filter && 'No actions match your filter'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredActions.map((action, index) => {
              const Icon = actionIcons[action.action_type] || MousePointer
              const actionKey = action.id || `action-${index}-${action.created_at}`
              const isExpanded = expandedActions.has(actionKey)

              return (
                <div
                  key={actionKey}
                  className={cn(
                    'p-3 hover:bg-surface-elevated transition-colors cursor-pointer',
                    action.screenshot_url && 'border-l-2 border-accent'
                  )}
                  onClick={() => onSelectAction(action)}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'shrink-0 w-8 h-8 flex items-center justify-center',
                        action.success
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-error/10 text-error-muted'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">#{index + 1}</span>
                        <span className="text-sm font-medium text-foreground capitalize">
                          {getActionDisplayName(action)}
                        </span>
                        {action.success ? (
                          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <XCircle className="h-3 w-3 text-error-muted" />
                        )}
                      </div>

                      {/* Goal - what the agent is trying to do */}
                      {(action.target_description || action.metadata?.goal) && (
                        <div className="mt-2 flex items-start gap-2">
                          <span className="text-base">🎯</span>
                          <p className="text-sm text-foreground">
                            {action.metadata?.goal || action.target_description}
                          </p>
                        </div>
                      )}

                      {/* Evaluation - how the previous step went */}
                      {action.metadata?.evaluation && (
                        <div className="mt-1 flex items-start gap-2">
                          <span className="text-base">👍</span>
                          <p className="text-xs text-muted-foreground">
                            {action.metadata.evaluation}
                          </p>
                        </div>
                      )}

                      {/* Memory - agent's working memory */}
                      {action.metadata?.memory && (
                        <div className="mt-1 flex items-start gap-2">
                          <span className="text-base">🧠</span>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {action.metadata.memory}
                          </p>
                        </div>
                      )}

                      {/* Result - what happened */}
                      {action.output_value && (
                        <div className="mt-1 flex items-start gap-2">
                          <span className="text-base">✅</span>
                          <p className="text-xs text-accent">
                            {action.output_value}
                          </p>
                        </div>
                      )}

                      {action.error_message && (
                        <div className="mt-1 flex items-start gap-2">
                          <span className="text-base">❌</span>
                          <p className="text-xs text-error-muted">
                            {action.error_message}
                          </p>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleExpand(actionKey)
                      }}
                      className="p-1 text-muted-foreground hover:text-foreground"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pl-11 space-y-2 text-xs">
                      {action.input_value && (
                        <div className="flex gap-2">
                          <span className="text-muted-foreground">Input:</span>
                          <span className="text-foreground">{action.input_value}</span>
                        </div>
                      )}
                      {action.output_value && (
                        <div className="flex gap-2">
                          <span className="text-muted-foreground">Output:</span>
                          <span className="text-foreground">{action.output_value}</span>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <span className="text-muted-foreground">Time:</span>
                        <span className="text-foreground">
                          {new Date(action.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      {action.metadata && Object.keys(action.metadata).length > 0 && (
                        <div className="mt-2 p-2 bg-surface-elevated text-xs">
                          <pre className="overflow-x-auto">
                            {JSON.stringify(action.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Card>
  )
}
