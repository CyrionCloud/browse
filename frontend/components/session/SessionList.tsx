'use client'

import { useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { Button, Card, Badge, Spinner } from '@/components/ui'
import {
  Play,
  Pause,
  Square,
  Trash2,
  ExternalLink,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react'
import { cn, formatDuration, formatDate } from '@/lib/utils'
import type { SessionStatus, BrowserSession } from '@autobrowse/shared'

interface SessionCardProps {
  session: BrowserSession
  onStart: (id: string) => void
  onPause: (id: string) => void
  onCancel: (id: string) => void
  onDelete: (id: string) => void
  onSelect: (session: BrowserSession) => void
}

const statusConfig: Record<SessionStatus, { icon: typeof CheckCircle2; color: string; label: string }> = {
  pending: { icon: Clock, color: 'warning', label: 'Pending' },
  active: { icon: Play, color: 'primary', label: 'Active' },
  paused: { icon: Pause, color: 'warning', label: 'Paused' },
  completed: { icon: CheckCircle2, color: 'success', label: 'Completed' },
  failed: { icon: XCircle, color: 'alert', label: 'Failed' },
  cancelled: { icon: Square, color: 'default', label: 'Cancelled' },
}

function SessionCard({ session, onStart, onPause, onCancel, onDelete, onSelect }: SessionCardProps) {
  const status = statusConfig[session.status]
  const StatusIcon = status.icon

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:border-primary-500/50',
        session.status === 'active' && 'border-primary-500/50 glow-sm'
      )}
      onClick={() => onSelect(session)}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <StatusIcon
                className={cn(
                  'h-4 w-4',
                  status.color === 'primary' && 'text-primary-500',
                  status.color === 'success' && 'text-success-500',
                  status.color === 'warning' && 'text-warning-500',
                  status.color === 'alert' && 'text-alert-500',
                  status.color === 'default' && 'text-text-muted'
                )}
              />
              <Badge variant={status.color as any}>{status.label}</Badge>
            </div>
            <h3 className="font-medium text-foreground truncate">
              {session.task_description}
            </h3>
            <p className="text-sm text-text-secondary mt-1">
              {formatDate(session.created_at)}
            </p>
          </div>

          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {session.status === 'pending' && (
              <Button variant="ghost" size="icon" onClick={() => onStart(session.id)}>
                <Play className="h-4 w-4 text-success-500" />
              </Button>
            )}
            {session.status === 'active' && (
              <>
                <Button variant="ghost" size="icon" onClick={() => onPause(session.id)}>
                  <Pause className="h-4 w-4 text-warning-500" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onCancel(session.id)}>
                  <Square className="h-4 w-4 text-alert-500" />
                </Button>
              </>
            )}
            {session.status === 'paused' && (
              <Button variant="ghost" size="icon" onClick={() => onStart(session.id)}>
                <Play className="h-4 w-4 text-success-500" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => onDelete(session.id)}>
              <Trash2 className="h-4 w-4 text-text-muted" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-dark-border text-xs text-text-muted">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {session.duration_seconds ? formatDuration(session.duration_seconds) : '-'}
          </span>
          <span>{session.actions_count} actions</span>
          {session.result && (
            <span className="flex items-center gap-1 text-success-500">
              <CheckCircle2 className="h-3 w-3" />
              Completed
            </span>
          )}
        </div>
      </div>
    </Card>
  )
}

interface SessionListProps {
  onStartSession: (id: string) => void
  onPauseSession: (id: string) => void
  onCancelSession: (id: string) => void
  onDeleteSession: (id: string) => void
  onSelectSession: (session: BrowserSession) => void
}

export function SessionList({
  onStartSession,
  onPauseSession,
  onCancelSession,
  onDeleteSession,
  onSelectSession,
}: SessionListProps) {
  const { sessions } = useAppStore()
  const [filter, setFilter] = useState<SessionStatus | 'all'>('all')

  const filteredSessions = sessions.filter(
    (s) => filter === 'all' || s.status === filter
  )

  const activeSessions = sessions.filter((s) => s.status === 'active')
  const recentSessions = sessions.filter(
    (s) => s.status === 'completed' || s.status === 'failed' || s.status === 'cancelled'
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Sessions</h2>
        <div className="flex gap-2">
          {(['all', 'active', 'completed', 'failed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1 text-xs rounded-md transition-colors',
                filter === f
                  ? 'bg-primary-500/20 text-primary-400'
                  : 'text-text-muted hover:text-foreground'
              )}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {activeSessions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-text-secondary">Active</h3>
          {activeSessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              onStart={onStartSession}
              onPause={onPauseSession}
              onCancel={onCancelSession}
              onDelete={onDeleteSession}
              onSelect={onSelectSession}
            />
          ))}
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-text-secondary">
          {filter === 'all' ? 'Recent Sessions' : filter.charAt(0).toUpperCase() + filter.slice(1)}
        </h3>
        {filteredSessions.length === 0 ? (
          <div className="text-center py-8 text-text-muted">
            <p>No sessions found</p>
          </div>
        ) : (
          filteredSessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              onStart={onStartSession}
              onPause={onPauseSession}
              onCancel={onCancelSession}
              onDelete={onDeleteSession}
              onSelect={onSelectSession}
            />
          ))
        )}
      </div>
    </div>
  )
}
