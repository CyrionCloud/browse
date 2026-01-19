'use client'

import { CheckCircle2, Circle, AlertCircle, Loader2, SkipForward, RotateCcw, Clock } from 'lucide-react'
import { SubtaskExecution } from '@/lib/api/decomposition'
import { formatDistanceToNow } from 'date-fns'

interface SubtaskCardProps {
    execution: SubtaskExecution
    isActive: boolean
    onRetry?: () => void
    onSkip?: () => void
}

export function SubtaskCard({ execution, isActive, onRetry, onSkip }: SubtaskCardProps) {
    const getStatusIcon = () => {
        switch (execution.status) {
            case 'completed':
                return <CheckCircle2 className="w-5 h-5 text-green-500" />
            case 'in_progress':
                return <Loader2 className="w-5 h-5 text-accent animate-spin" />
            case 'failed':
                return <AlertCircle className="w-5 h-5 text-red-500" />
            case 'skipped':
                return <SkipForward className="w-5 h-5 text-muted-foreground" />
            default:
                return <Circle className="w-5 h-5 text-muted-foreground" />
        }
    }

    const getStatusColor = () => {
        switch (execution.status) {
            case 'completed':
                return 'border-green-500/30 bg-green-500/5'
            case 'in_progress':
                return 'border-accent/50 bg-accent/10'
            case 'failed':
                return 'border-red-500/30 bg-red-500/5'
            case 'skipped':
                return 'border-border bg-surface'
            default:
                return 'border-border bg-surface'
        }
    }

    return (
        <div
            className={`p-4 rounded-lg border-2 transition-all ${getStatusColor()} ${isActive ? 'ring-2 ring-accent' : ''
                }`}
        >
            {/* Header */}
            <div className="flex items-start gap-3 mb-2">
                {getStatusIcon()}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-muted-foreground">
                            Step {execution.subtask_index + 1}
                        </span>
                        {execution.status === 'in_progress' && isActive && (
                            <span className="text-xs px-2 py-0.5 bg-accent/20 text-accent rounded-full animate-pulse">
                                Active
                            </span>
                        )}
                    </div>
                    <p className="text-sm font-medium text-foreground">
                        {execution.subtask_description}
                    </p>
                </div>
            </div>

            {/* Expected Outcome */}
            {execution.expected_outcome && (
                <p className="text-xs text-muted-foreground mb-2 ml-8">
                    Expected: {execution.expected_outcome}
                </p>
            )}

            {/* Error Message */}
            {execution.error_message && (
                <div className="ml-8 mb-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
                    {execution.error_message}
                </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between ml-8 mt-3">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {execution.duration && (
                        <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{execution.duration}s</span>
                        </div>
                    )}
                    {execution.retry_count > 0 && (
                        <span>Retry {execution.retry_count}</span>
                    )}
                    {execution.completed_at && (
                        <span>{formatDistanceToNow(new Date(execution.completed_at), { addSuffix: true })}</span>
                    )}
                </div>

                {/* Action Buttons */}
                {execution.status === 'failed' && (
                    <div className="flex gap-2">
                        {onRetry && (
                            <button
                                onClick={onRetry}
                                className="px-3 py-1 text-xs bg-accent/20 hover:bg-accent/30 text-accent rounded transition-colors flex items-center gap-1"
                            >
                                <RotateCcw className="w-3 h-3" />
                                Retry
                            </button>
                        )}
                        {onSkip && (
                            <button
                                onClick={onSkip}
                                className="px-3 py-1 text-xs bg-surface-elevated hover:bg-muted text-muted-foreground rounded transition-colors flex items-center gap-1"
                            >
                                <SkipForward className="w-3 h-3" />
                                Skip
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Screenshot */}
            {execution.screenshot_url && (
                <div className="ml-8 mt-3">
                    <img
                        src={execution.screenshot_url}
                        alt="Subtask screenshot"
                        className="rounded border border-border max-h-32 object-contain"
                    />
                </div>
            )}
        </div>
    )
}
