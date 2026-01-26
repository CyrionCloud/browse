'use client'

import { useState } from 'react'
import { Card } from '@/components/ui'
import { cn, formatDate } from '@/lib/utils'
import {
    Clock,
    Camera,
    ChevronDown,
    ChevronRight,
    Expand,
    Globe,
    MousePointer,
    Type,
    CheckCircle,
    AlertCircle,
} from 'lucide-react'

export interface TimelineEntry {
    id: string
    timestamp: Date
    step: number
    screenshot?: string
    goal?: string
    action?: string
    evaluation?: string
    memory?: string
    result?: string
    url?: string
}

interface TimelinePanelProps {
    entries: TimelineEntry[]
    sessionStatus: string
    className?: string
    onEntryClick?: (entry: TimelineEntry) => void
}

function formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    })
}

// Convert technical action to human-readable description
function getHumanReadableAction(entry: TimelineEntry): { icon: any, text: string, color: string } {
    const action = entry.action || ''
    const goal = entry.goal || ''
    const url = entry.url || ''

    // Try to parse action if it's JSON
    let actionType = ''
    let actionDetails: any = {}

    try {
        if (typeof action === 'string' && action.trim().startsWith('{')) {
            const parsed = JSON.parse(action)
            if (Array.isArray(parsed) && parsed.length > 0) {
                const firstAction = parsed[0]
                actionType = Object.keys(firstAction)[0]
                actionDetails = firstAction[actionType]
            }
        } else if (typeof action === 'object') {
            actionType = Object.keys(action)[0]
            actionDetails = action[actionType]
        }
    } catch (e) {
        // Fallback to string analysis
    }

    // Navigation actions
    if (actionType.includes('go_to_url') || goal.toLowerCase().includes('navigate') || goal.toLowerCase().includes('open')) {
        const targetUrl = actionDetails?.url || url
        const domain = targetUrl ? new URL(targetUrl).hostname : 'page'
        return {
            icon: Globe,
            text: `🌐 Navigated to ${domain}`,
            color: 'text-blue-400'
        }
    }

    // Click actions
    if (actionType.includes('click') || goal.toLowerCase().includes('click')) {
        const target = actionDetails?.description || actionDetails?.selector || 'element'
        return {
            icon: MousePointer,
            text: `🖱️ Clicked "${target}"`,
            color: 'text-purple-400'
        }
    }

    // Type/Fill actions
    if (actionType.includes('type') || actionType.includes('fill') || goal.toLowerCase().includes('type') || goal.toLowerCase().includes('enter')) {
        const text = actionDetails?.text || actionDetails?.value || 'text'
        const truncated = text.length > 30 ? text.substring(0, 30) + '...' : text
        return {
            icon: Type,
            text: `⌨️ Typed "${truncated}"`,
            color: 'text-green-400'
        }
    }

    // Extract/Search actions
    if (actionType.includes('extract') || goal.toLowerCase().includes('extract') || goal.toLowerCase().includes('find')) {
        return {
            icon: CheckCircle,
            text: `📊 Extracted information`,
            color: 'text-emerald-400'
        }
    }

    // Scroll actions
    if (actionType.includes('scroll') || goal.toLowerCase().includes('scroll')) {
        return {
            icon: MousePointer,
            text: `📜 Scrolled page`,
            color: 'text-gray-400'
        }
    }

    // Wait actions
    if (actionType.includes('wait') || goal.toLowerCase().includes('wait')) {
        return {
            icon: Clock,
            text: `⏱️ Waited for page`,
            color: 'text-yellow-400'
        }
    }

    // Default: use goal or action type
    const displayText = goal || actionType || 'Performed action'
    return {
        icon: CheckCircle,
        text: displayText.length > 60 ? displayText.substring(0, 60) + '...' : displayText,
        color: 'text-muted-foreground'
    }
}

export function TimelinePanel({
    entries,
    sessionStatus,
    className,
    onEntryClick,
}: TimelinePanelProps) {
    const [expandedEntry, setExpandedEntry] = useState<string | null>(null)

    const toggleEntry = (id: string) => {
        setExpandedEntry(expandedEntry === id ? null : id)
    }

    if (entries.length === 0) {
        return (
            <Card className={cn('flex items-center justify-center h-full', className)}>
                <div className="text-center text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm">No timeline entries yet</p>
                    <p className="text-xs mt-1">
                        {sessionStatus === 'active'
                            ? 'Timeline will populate as the agent works...'
                            : 'Start the session to begin recording'}
                    </p>
                </div>
            </Card>
        )
    }

    return (
        <Card className={cn('flex flex-col h-full overflow-hidden', className)}>
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-border bg-surface-elevated">
                <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-accent" />
                    <span className="text-sm font-medium text-foreground">Session Timeline</span>
                    <span className="text-xs text-muted-foreground">
                        ({entries.length} steps)
                    </span>
                </div>
            </div>

            {/* Timeline entries */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {entries.map((entry, index) => {
                    const humanAction = getHumanReadableAction(entry)
                    const Icon = humanAction.icon

                    return (
                        <div
                            key={entry.id}
                            className={cn(
                                'border border-border rounded-lg overflow-hidden transition-all',
                                expandedEntry === entry.id ? 'bg-surface-elevated' : 'bg-surface hover:bg-surface-elevated'
                            )}
                        >
                            {/* Entry header - always visible */}
                            <button
                                onClick={() => toggleEntry(entry.id)}
                                className="w-full flex items-start gap-3 p-3 text-left"
                            >
                                {/* Timeline dot and line */}
                                <div className="flex flex-col items-center flex-shrink-0">
                                    <div className={cn(
                                        'w-3 h-3 rounded-full border-2',
                                        entry.screenshot ? 'bg-accent border-accent' : 'bg-muted border-border'
                                    )} />
                                    {index < entries.length - 1 && (
                                        <div className="w-0.5 h-4 bg-border mt-1" />
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-mono text-muted-foreground">
                                                {formatTime(entry.timestamp)}
                                            </span>
                                            <span className="text-xs bg-accent/10 text-accent px-1.5 py-0.5 rounded">
                                                Step {entry.step}
                                            </span>
                                            {entry.screenshot && (
                                                <Camera className="h-3 w-3 text-accent" />
                                            )}
                                        </div>
                                        {expandedEntry === entry.id ? (
                                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                        ) : (
                                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                        )}
                                    </div>

                                    {/* Human-readable action */}
                                    <div className="flex items-center gap-2">
                                        <Icon className={cn("h-4 w-4", humanAction.color)} />
                                        <p className="text-sm text-foreground">
                                            {humanAction.text}
                                        </p>
                                    </div>
                                </div>
                            </button>

                            {/* Expanded content */}
                            {expandedEntry === entry.id && (
                                <div className="px-3 pb-3 pt-0 ml-6 border-t border-border mt-0">
                                    {/* Screenshot */}
                                    {entry.screenshot && (
                                        <div className="mt-3 mb-3">
                                            <div className="relative group">
                                                <img
                                                    src={`data:image/png;base64,${entry.screenshot}`}
                                                    alt={`Step ${entry.step} screenshot`}
                                                    className="rounded-lg border border-border max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                                                    onClick={() => {
                                                        onEntryClick?.(entry)
                                                    }}
                                                />
                                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        className="p-1 bg-black/50 rounded text-white hover:bg-black/70"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            onEntryClick?.(entry)
                                                        }}
                                                    >
                                                        <Expand className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* URL */}
                                    {entry.url && (
                                        <div className="flex items-start gap-2 text-xs text-muted-foreground mb-2">
                                            <Globe className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                            <span className="break-all">{entry.url}</span>
                                        </div>
                                    )}

                                    {/* Evaluation */}
                                    {entry.evaluation && (
                                        <div className="flex items-start gap-2 text-xs mb-2">
                                            <span className="flex-shrink-0">👍</span>
                                            <span className="text-muted-foreground">{entry.evaluation}</span>
                                        </div>
                                    )}

                                    {/* Result */}
                                    {entry.result && (
                                        <div className="flex items-start gap-2 text-xs">
                                            <span className="flex-shrink-0">✅</span>
                                            <span className="text-accent">{entry.result}</span>
                                        </div>
                                    )}

                                    {/* Timestamp */}
                                    <div className="mt-3 pt-2 border-t border-border/50 text-xs text-muted-foreground">
                                        {entry.timestamp.toLocaleString()}
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </Card>
    )
}
