'use client'

import { cn } from '@/lib/utils'
import type { SessionStatus } from '@autobrowse/shared'

interface ProgressIndicatorProps {
  current: number
  total: number
  status: SessionStatus
}

export function ProgressIndicator({ current, total, status }: ProgressIndicatorProps) {
  const percentage = total > 0 ? Math.min((current / total) * 100, 100) : 0

  const getStatusColor = () => {
    switch (status) {
      case 'active':
        return 'bg-accent'
      case 'completed':
        return 'bg-success'
      case 'failed':
        return 'bg-error'
      case 'cancelled':
        return 'bg-muted-foreground'
      case 'paused':
        return 'bg-warning'
      default:
        return 'bg-muted-foreground'
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'pending':
        return 'Ready to start'
      case 'active':
        return `Step ${current} of ${total}`
      case 'paused':
        return `Paused at step ${current}`
      case 'completed':
        return `Completed ${current} steps`
      case 'failed':
        return `Failed at step ${current}`
      case 'cancelled':
        return `Cancelled at step ${current}`
      default:
        return ''
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{getStatusText()}</span>
        <span className="text-foreground font-medium">{Math.round(percentage)}%</span>
      </div>

      <div className="h-2 bg-surface-elevated overflow-hidden">
        <div
          className={cn(
            'h-full transition-all duration-500 ease-out',
            getStatusColor(),
            status === 'active' && 'animate-pulse'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {status === 'active' && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Processing...</span>
          <span>{total - current} steps remaining</span>
        </div>
      )}
    </div>
  )
}
