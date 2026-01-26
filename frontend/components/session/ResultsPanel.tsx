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
    ChevronDown,
    ChevronRight,
    Sparkles,
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
    const [showTechnical, setShowTechnical] = useState(false)

    // Extract findings from actions
    useEffect(() => {
        const newFindings: Finding[] = []

        // Extract key user-facing results
        actions.forEach((action, index) => {
            // Extract meaningful results only
            if (action.output_value && action.output_value.length > 10) {
                newFindings.push({
                    id: `result-${index}`,
                    type: 'result',
                    title: 'Found Information',
                    content: action.output_value.slice(0, 300) + (action.output_value.length > 300 ? '...' : ''),
                    timestamp: new Date(action.created_at),
                })
            }
        })

        setFindings(newFindings)
    }, [actions, sessionStatus, taskDescription, result])

    const getStatusBadge = () => {
        switch (sessionStatus) {
            case 'completed':
                return <div className="flex items-center gap-1 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded text-emerald-400 text-xs font-medium">
                    <CheckCircle2 className="h-3 w-3" />
                    Completed Successfully
                </div>
            case 'failed':
                return <div className="flex items-center gap-1 px-2 py-1 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-xs font-medium">
                    <AlertCircle className="h-3 w-3" />
                    Failed
                </div>
            case 'active':
                return <div className="flex items-center gap-1 px-2 py-1 bg-accent/10 border border-accent/20 rounded text-accent text-xs font-medium">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    In Progress
                </div>
            default:
                return <div className="flex items-center gap-1 px-2 py-1 bg-muted border border-border rounded text-muted-foreground text-xs font-medium">
                    <Circle className="h-3 w-3" />
                    {sessionStatus}
                </div>
        }
    }

    return (
        <Card className={cn('flex flex-col h-full overflow-hidden', className)}>
            {/* Header */}
            <div className="flex items-center gap-2 p-3 border-b border-border">
                <FileText className="h-5 w-5 text-accent" />
                <span className="text-sm font-medium text-foreground">Results</span>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {/* Summary Section */}
                <div className="p-4 border-b border-border bg-surface-elevated/50">
                    <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                                <Sparkles className="h-4 w-4 text-accent" />
                                <h3 className="text-sm font-semibold text-foreground">Task Summary</h3>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {taskDescription || 'No task description provided'}
                            </p>
                        </div>
                        {getStatusBadge()}
                    </div>

                    {/* Quick Stats */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3 pt-3 border-t border-border/50">
                        <div className="flex items-center gap-1">
                            <span className="font-medium text-foreground">{actions.length}</span>
                            <span>actions performed</span>
                        </div>
                        {findings.length > 0 && (
                            <div className="flex items-center gap-1">
                                <span className="font-medium text-foreground">{findings.length}</span>
                                <span>results found</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Key Findings */}
                {findings.length > 0 && (
                    <div className="p-4 border-b border-border">
                        <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Lightbulb className="h-4 w-4 text-accent" />
                            Key Findings
                        </h4>
                        <div className="space-y-3">
                            {findings.map((finding) => (
                                <div
                                    key={finding.id}
                                    className="p-3 rounded-lg border border-accent/20 bg-accent/5"
                                >
                                    <p className="text-sm text-foreground leading-relaxed">
                                        {finding.content}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Final Result */}
                {sessionStatus === 'completed' && result && (
                    <div className="p-4 border-b border-border">
                        <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                            Final Output
                        </h4>
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg overflow-auto max-h-[300px]">
                            {(() => {
                                try {
                                    const json = JSON.parse(result)
                                    return (
                                        <pre className="text-xs font-mono text-foreground whitespace-pre-wrap break-all">
                                            {JSON.stringify(json, null, 2)}
                                        </pre>
                                    )
                                } catch {
                                    return (
                                        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                                            {result}
                                        </p>
                                    )
                                }
                            })()}
                        </div>
                    </div>
                )}

                {/* Technical Details (Collapsible) */}
                <div className="p-4">
                    <button
                        onClick={() => setShowTechnical(!showTechnical)}
                        className="w-full flex items-center justify-between text-left hover:bg-surface-elevated rounded p-2 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Technical Details
                            </h4>
                            <span className="text-xs text-muted-foreground">
                                ({actions.length} actions)
                            </span>
                        </div>
                        {showTechnical ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                    </button>

                    {showTechnical && (
                        <div className="mt-3 space-y-2">
                            {actions.slice(-10).map((action, index) => (
                                <div
                                    key={action.id}
                                    className="p-2 rounded border border-border bg-surface text-xs"
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                                        <span className="font-medium text-foreground">
                                            {action.action_type}
                                        </span>
                                        {action.duration_ms && (
                                            <span className="text-muted-foreground ml-auto">
                                                {action.duration_ms}ms
                                            </span>
                                        )}
                                    </div>
                                    {action.target_description && (
                                        <p className="text-muted-foreground pl-5">
                                            {action.target_description}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Empty State */}
                {actions.length === 0 && (
                    <div className="flex-1 flex items-center justify-center p-8">
                        <div className="text-center text-muted-foreground">
                            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p className="text-sm font-medium">No results yet</p>
                            <p className="text-xs mt-1">
                                {sessionStatus === 'pending' && 'Start the session to see results'}
                                {sessionStatus === 'active' && 'Results will appear as the agent works...'}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </Card>
    )
}
