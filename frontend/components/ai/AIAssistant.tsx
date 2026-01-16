'use client'

import { useState, useEffect, useRef } from 'react'
import { sessionsApi } from '@/lib/api'
import { cn, formatDuration } from '@/lib/utils'
import { Card, Button, Input } from '@/components/ui'
import {
  Lightbulb,
  ArrowUp,
  Clock,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react'
import type { BrowserSession } from '@autobrowse/shared'

interface TaskSuggestion {
  id: string
  title: string
  description: string
  confidence: number
  estimatedTime: string
  type: 'frequent' | 'popular' | 'personalized' | 'trending'
}

interface AIAssistantProps {
  sessionId: string
  session: BrowserSession
  suggestions: TaskSuggestion[]
  onApplySuggestion: (suggestion: TaskSuggestion) => void
}

export function AIAssistant({ sessionId, session, suggestions, onApplySuggestion }: AIAssistantProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)

  useEffect(() => {
    setApplying(true)
    const timer = setTimeout(() => setApplying(false), 1000)
    return () => clearTimeout(timer)
  }, [])

  const handleApplySuggestion = async (suggestion: TaskSuggestion) => {
    try {
      setLoading(true)
      onApplySuggestion(suggestion)
      await sessionsApi.start(sessionId)

      setApplying(false)
    } catch (error: any) {
      console.error('Failed to apply suggestion:', error)
      setApplying(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-accent shrink-0" />
          <span className="text-foreground text-sm font-medium">AI-Powered Suggestions</span>
        </div>

        {loading && (
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3 text-accent animate-spin" />
            <span className="text-sm text-muted-foreground">Generating suggestions...</span>
          </div>
        )}

        {!loading && suggestions.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
            <Lightbulb className="h-8 w-8 text-muted" />
            <p className="text-sm">No suggestions available yet</p>
          </div>
        )}

        {!loading && suggestions.length > 0 && (
          <div className="space-y-3">
            {suggestions.map((suggestion, index) => (
              <div
                key={suggestion.id}
                onClick={() => setSelectedIndex(index)}
                className={cn(
                  'cursor-pointer p-3 rounded-lg border border transition-colors hover:bg-accent/10',
                  selectedIndex === index && 'bg-accent/20 border-accent'
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-start gap-2 mb-2">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center',
                        suggestion.type === 'frequent' && 'bg-emerald-500/20 text-foreground',
                        suggestion.type === 'popular' && 'bg-blue-500/20 text-foreground',
                        suggestion.type === 'personalized' && 'bg-purple-500/20 text-foreground',
                        suggestion.type === 'trending' && 'gradient-rainbow-to-from-blue',
                        suggestion.confidence < 0.5 && 'opacity-50',
                      )}
                    >
                      <CheckCircle2 className="h-5 w-5 text-foreground" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground line-clamp-2">
                        {suggestion.title}
                      </div>

                      <div className="text-xs text-muted-foreground">
                        {suggestion.estimatedTime}
                      </div>
                    </div>
                  </div>

                  <div className="p-2">
                    <p className="text-sm text-muted-foreground">
                      {suggestion.description}
                    </p>

                  {suggestion.confidence >= 0.8 && (
                    <div className="flex items-center gap-2 text-xs">
                      <Zap className="h-3 w-3 text-accent" />
                      <span className="text-success">
                        {Math.round(suggestion.confidence * 100)}% confident
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <Button
                variant={selectedIndex === index ? 'accent' : 'outline'}
                size="sm"
                onClick={handleApplySuggestion}
                disabled={loading}
                className="shrink-0"
              >
                <ArrowUp className="h-3 w-3 text-foreground" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {selectedIndex !== null && (
        <div className="border-t border-border mt-3 pt-3">
          <div className="space-y-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedIndex(null)}
              disabled={loading}
            >
              Close details
            </Button>

            <div className="space-y-2">
              <h4 className="text-lg font-semibold text-foreground">
                {suggestions[selectedIndex].title}
              </h4>

              <p className="text-sm text-muted-foreground">
                {suggestions[selectedIndex].description}
              </p>

              <div className="space-y-3">
                <div className="text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{suggestions[selectedIndex].estimatedTime}</span>
                  </span>
                  <span className="text-foreground">
                    {suggestions[selectedIndex].estimatedSteps} steps
                  </span>
                </div>
              </div>

              <Button
                variant="accent"
                size="sm"
                onClick={handleApplySuggestion}
                disabled={loading}
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="h-3 w-3 text-accent" />
                  Apply this suggestion
                </span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
