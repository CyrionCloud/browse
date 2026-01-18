'use client'

import { useState } from 'react'
import { Card } from '@/components/ui'
import { cn, formatDate } from '@/lib/utils'
import {
    Clock,
    Camera,
    ChevronDown,
    ChevronRight,
    Download,
    Expand,
    MousePointer,
    Navigation,
    MessageSquare,
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

export function TimelinePanel({
    entries,
    sessionStatus,
    className,
    onEntryClick,
}: TimelinePanelProps) {
    const [expandedEntry, setExpandedEntry] = useState<string | null>(null)
    const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null)

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
                        ({entries.length} entries)
                    </span>
                </div>
            </div>

            {/* Timeline entries */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {entries.map((entry, index) => (
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
                                <div className="flex items-center justify-between">
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

                                {/* Goal preview */}
                                {entry.goal && (
                                    <p className="text-sm text-foreground mt-1 line-clamp-1">
                                        🎯 {entry.goal}
                                    </p>
                                )}
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
                                                    setSelectedScreenshot(entry.screenshot!)
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
                                        <Navigation className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                        <span className="break-all">{entry.url}</span>
                                    </div>
                                )}

                                {/* Action */}
                                {entry.action && (
                                    <div className="flex items-start gap-2 text-xs mb-2">
                                        <MousePointer className="h-3 w-3 mt-0.5 text-accent flex-shrink-0" />
                                        <span className="text-foreground">
                                            {typeof entry.action === 'string'
                                                ? entry.action
                                                : JSON.stringify(entry.action)}
                                        </span>
                                    </div>
                                )}

                                {/* Evaluation */}
                                {entry.evaluation && (
                                    <div className="flex items-start gap-2 text-xs mb-2">
                                        <span className="flex-shrink-0">👍</span>
                                        <span className="text-muted-foreground">{entry.evaluation}</span>
                                    </div>
                                )}

                                {/* Memory */}
                                {entry.memory && (
                                    <div className="flex items-start gap-2 text-xs mb-2">
                                        <span className="flex-shrink-0">🧠</span>
                                        <span className="text-muted-foreground line-clamp-3">{entry.memory}</span>
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
                ))}
            </div>
        </Card>
    )
}
