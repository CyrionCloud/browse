'use client'

import { useState, useEffect } from 'react'
import { DecompositionWithExecutions, decompositionApi } from '@/lib/api/decomposition'
import { SubtaskCard } from './SubtaskCard'
import { Card } from '@/components/ui'
import { ListTodo, TrendingUp } from 'lucide-react'

interface TaskBreakdownProps {
    sessionId: string
    onRetrySubtask?: (decompositionId: string, subtaskIndex: number) => void
    onSkipSubtask?: (decompositionId: string, subtaskIndex: number) => void
}

export function TaskBreakdown({ sessionId, onRetrySubtask, onSkipSubtask }: TaskBreakdownProps) {
    const [data, setData] = useState<DecompositionWithExecutions | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        loadDecomposition()
    }, [sessionId])

    const loadDecomposition = async () => {
        setLoading(true)
        setError(null)
        try {
            const result = await decompositionApi.getBySession(sessionId)
            setData(result)
        } catch (err: any) {
            if (err.response?.status === 404) {
                setError('No task breakdown available')
            } else {
                setError('Failed to load task breakdown')
            }
        } finally {
            setLoading(false)
        }
    }

    const handleRetry = async (subtaskIndex: number) => {
        if (!data) return

        try {
            await decompositionApi.retrySubtask(data.decomposition.id, subtaskIndex)
            await loadDecomposition() // Reload to get updated status
            onRetrySubtask?.(data.decomposition.id, subtaskIndex)
        } catch (err) {
            console.error('Failed to retry subtask:', err)
        }
    }

    const handleSkip = async (subtaskIndex: number) => {
        if (!data) return

        try {
            await decompositionApi.skipSubtask(data.decomposition.id, subtaskIndex)
            await loadDecomposition()
            onSkipSubtask?.(data.decomposition.id, subtaskIndex)
        } catch (err) {
            console.error('Failed to skip subtask:', err)
        }
    }

    if (loading) {
        return (
            <Card className="p-6">
                <div className="flex items-center justify-center">
                    <div className="w-6 h-6 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                </div>
            </Card>
        )
    }

    if (error || !data) {
        return null // Don't show anything if no decomposition
    }

    const { decomposition, executions } = data
    const completedCount = decomposition.completed_subtasks.length
    const totalCount = decomposition.subtasks.length
    const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

    return (
        <Card className="p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                    <ListTodo className="w-5 h-5 text-accent" />
                    <h3 className="font-semibold text-foreground">Task Breakdown</h3>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <TrendingUp className="w-4 h-4" />
                    <span>{progressPercent}% Complete</span>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
                <div className="h-2 bg-surface-elevated rounded-full overflow-hidden">
                    <div
                        className="h-full bg-accent transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>{completedCount} of {totalCount} steps completed</span>
                    {decomposition.total_estimated_duration && (
                        <span>Est. {Math.round(decomposition.total_estimated_duration / 60)}min total</span>
                    )}
                </div>
            </div>

            {/* Original Task */}
            <div className="mb-4 p-3 bg-surface-elevated rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Original Task:</p>
                <p className="text-sm text-foreground">{decomposition.original_task}</p>
            </div>

            {/* Subtasks */}
            <div className="space-y-3">
                {executions.map((execution) => (
                    <SubtaskCard
                        key={execution.id}
                        execution={execution}
                        isActive={execution.subtask_index === decomposition.current_subtask_index}
                        onRetry={() => handleRetry(execution.subtask_index)}
                        onSkip={() => handleSkip(execution.subtask_index)}
                    />
                ))}
            </div>

            {/* Completion Message */}
            {progressPercent === 100 && (
                <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-center">
                    <p className="text-sm text-green-400 font-medium">
                        ✅ All steps completed successfully!
                    </p>
                </div>
            )}
        </Card>
    )
}
