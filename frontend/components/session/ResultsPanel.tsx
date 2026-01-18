'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui'
import { cn } from '@/lib/utils'
import {
    CheckCircle2,
    Circle,
    Loader2,
    AlertCircle,
    FileText,
    Target,
    Lightbulb,
} from 'lucide-react'
import type { BrowserAction, SessionStatus } from '@autobrowse/shared'

interface Finding {
    id: string
    type: 'info' | 'success' | 'warning' | 'result'
    title: string
    content: string
    timestamp: Date
}

interface ResultsPanelProps {
    actions: BrowserAction[]
    sessionStatus: SessionStatus
    taskDescription?: string
    result?: string | null
    className?: string
}

export function ResultsPanel({
    actions,
    sessionStatus,
    taskDescription,
    result,
    className,
}: ResultsPanelProps) {
    const [findings, setFindings] = useState<Finding[]>([])

    // Extract findings from actions
    useEffect(() => {
        const newFindings: Finding[] = []

        // Add task started finding
        if (actions.length > 0 || sessionStatus === 'active') {
            newFindings.push({
                id: 'task-start',
                type: 'info',
                title: 'Task Started',
                content: taskDescription || 'Executing automation task...',
                timestamp: new Date(),
            })
        }

        // Extract data from all actions with rich metadata
        actions.forEach((action, index) => {
            // Get action name from metadata
            let actionName: string = action.action_type
            if (action.metadata?.action && Array.isArray(action.metadata.action)) {
                const firstAction = action.metadata.action[0]
                if (typeof firstAction === 'object') {
                    const key = Object.keys(firstAction)[0]
                    if (key) actionName = key.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
                }
            }

            // Add goal if present
            if (action.metadata?.goal) {
                newFindings.push({
                    id: `goal-${index}`,
                    type: 'info',
                    title: `🎯 Step ${index + 1}: ${actionName}`,
                    content: action.metadata.goal,
                    timestamp: new Date(action.created_at),
                })
            }

            // Add evaluation if present
            if (action.metadata?.evaluation) {
                const isSuccess = action.metadata.evaluation.toLowerCase().includes('success')
                newFindings.push({
                    id: `eval-${index}`,
                    type: isSuccess ? 'success' : 'info',
                    title: isSuccess ? '👍 Evaluation' : '⚠️ Evaluation',
                    content: action.metadata.evaluation,
                    timestamp: new Date(action.created_at),
                })
            }

            // Add memory updates (summarized)
            if (action.metadata?.memory && index === actions.length - 1) {
                newFindings.push({
                    id: `memory-${index}`,
                    type: 'info',
                    title: '🧠 Agent Memory',
                    content: action.metadata.memory.length > 200
                        ? action.metadata.memory.slice(0, 200) + '...'
                        : action.metadata.memory,
                    timestamp: new Date(action.created_at),
                })
            }

            // Add extracted content
            if (action.output_value || (action.action_type === 'extract' && action.output_value)) {
                newFindings.push({
                    id: `result-${index}`,
                    type: 'result',
                    title: '✅ Result',
                    content: action.output_value.slice(0, 200) + (action.output_value.length > 200 ? '...' : ''),
                    timestamp: new Date(action.created_at),
                })
            }
        })

        // Add completion finding
        if (sessionStatus === 'completed') {
            newFindings.push({
                id: 'task-complete',
                type: 'success',
                title: 'Task Completed',
                content: result || `Successfully completed ${actions.length} actions.`,
                timestamp: new Date(),
            })
        }

        if (sessionStatus === 'failed') {
            const failedAction = actions.find((a) => !a.success)
            newFindings.push({
                id: 'task-failed',
                type: 'warning',
                title: 'Task Failed',
                content: failedAction?.error_message || 'An error occurred during execution.',
                timestamp: new Date(),
            })
        }

        setFindings(newFindings)
    }, [actions, sessionStatus, taskDescription, result])

    const getStepIcon = (index: number, total: number) => {
        if (sessionStatus === 'completed' || index < actions.length) {
            return <CheckCircle2 className="h-4 w-4 text-emerald-400" />
        }
        if (index === actions.length && sessionStatus === 'active') {
            return <Loader2 className="h-4 w-4 text-accent animate-spin" />
        }
        return <Circle className="h-4 w-4 text-muted-foreground" />
    }

    const getFindingIcon = (type: Finding['type']) => {
        switch (type) {
            case 'success':
                return <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            case 'warning':
                return <AlertCircle className="h-4 w-4 text-amber-400" />
            case 'result':
                return <Lightbulb className="h-4 w-4 text-accent" />
            default:
                return <Target className="h-4 w-4 text-muted-foreground" />
        }
    }

    return (
        <Card className={cn('flex flex-col h-full', className)}>
            {/* Header */}
            <div className="flex items-center gap-2 p-3 border-b border-border">
                <FileText className="h-5 w-5 text-accent" />
                <span className="text-sm font-medium text-foreground">Results & Steps</span>
                <span className="ml-auto text-xs text-muted-foreground">
                    {actions.length} actions
                </span>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {/* Steps Progress */}
                <div className="p-3 border-b border-border">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                        Progress
                    </h4>
                    <div className="space-y-2">
                        {actions.slice(-5).map((action, index) => (
                            <div key={action.id} className="flex items-start gap-2">
                                {getStepIcon(actions.length - 5 + index, actions.length)}
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-foreground truncate">
                                        {action.action_type.charAt(0).toUpperCase() + action.action_type.slice(1)}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {action.target_description || action.input_value || action.target_selector}
                                    </p>
                                </div>
                                {action.duration_ms && (
                                    <span className="text-xs text-muted-foreground">
                                        {action.duration_ms}ms
                                    </span>
                                )}
                            </div>
                        ))}
                        {actions.length === 0 && sessionStatus === 'pending' && (
                            <p className="text-xs text-muted-foreground italic">
                                Waiting for task to start...
                            </p>
                        )}
                        {actions.length === 0 && sessionStatus === 'active' && (
                            <div className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 text-accent animate-spin" />
                                <p className="text-xs text-muted-foreground">
                                    Initializing browser...
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Findings */}
                <div className="p-3">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                        Findings
                    </h4>
                    <div className="space-y-3">
                        {findings.map((finding) => (
                            <div
                                key={finding.id}
                                className={cn(
                                    'p-2 rounded-lg border',
                                    finding.type === 'success' && 'bg-emerald-500/10 border-emerald-500/20',
                                    finding.type === 'warning' && 'bg-amber-500/10 border-amber-500/20',
                                    finding.type === 'result' && 'bg-accent/10 border-accent/20',
                                    finding.type === 'info' && 'bg-surface-elevated border-border'
                                )}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    {getFindingIcon(finding.type)}
                                    <span className="text-xs font-medium text-foreground">
                                        {finding.title}
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground pl-6">
                                    {finding.content}
                                </p>
                            </div>
                        ))}
                        {findings.length === 0 && (
                            <p className="text-xs text-muted-foreground italic">
                                No findings yet...
                            </p>
                        )}
                    </div>
                </div>

                {/* Final Result (when completed) */}
                {sessionStatus === 'completed' && result && (
                    <div className="p-3 border-t border-border">
                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                            Final Result
                        </h4>
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                            <p className="text-sm text-foreground whitespace-pre-wrap">
                                {result}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </Card>
    )
}
