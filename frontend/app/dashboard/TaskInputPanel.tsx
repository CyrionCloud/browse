'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  ArrowRight,
  FileText,
  Layers,
  User,
  Link2,
  ChevronDown,
  Search,
  AlertTriangle,
} from 'lucide-react'

interface ExecutionMode {
  id: string
  name: string
  description: string
}

interface TaskInputPanelProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  selectedMode: ExecutionMode
  onModeChange: (mode: ExecutionMode) => void
}

const executionModes: ExecutionMode[] = [
  { id: 'autobrowse', name: 'Auto Browse LLM', description: 'Full browser automation' },
  { id: 'research', name: 'Research Agent', description: 'Deep web research' },
  { id: 'extraction', name: 'Extraction Agent', description: 'Data extraction focus' },
  { id: 'monitoring', name: 'Monitoring Agent', description: 'Continuous monitoring' },
]

const quickActions = [
  { id: 'extract', name: 'Extract', icon: Layers, mode: 'extraction' },
  { id: 'research', name: 'Research', icon: Search, mode: 'research' },
  { id: 'monitor', name: 'Monitor', icon: AlertTriangle, mode: 'monitoring' },
  { id: 'personal', name: 'Personal Tasks', icon: User, mode: 'autobrowse' },
]

export function TaskInputPanel({ value, onChange, onSubmit, selectedMode, onModeChange }: TaskInputPanelProps) {
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false)

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="flex items-center justify-center mb-4">
          <span className="inline-flex items-center px-3 py-1 text-xs font-medium bg-accent/10 text-accent border border-accent/20">
            Pay As You Go · Upgrade
          </span>
        </div>

        <h1 className="text-2xl font-semibold text-center text-foreground mb-8">
          What task should I handle?
        </h1>

        <div className="w-full max-w-4xl relative bg-surface border border-border p-5 shadow-lg">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Message Browser Use..."
            className="w-full min-h-[140px] bg-transparent text-foreground placeholder:text-muted-foreground resize-none focus:outline-none text-base"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                onSubmit()
              }
            }}
          />

          <div className="flex items-center justify-between pt-4 border-t border-border/50">
            <div className="flex items-center gap-1">
              <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-surface-elevated transition-colors">
                <FileText className="h-4 w-4" />
              </button>
              <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-surface-elevated transition-colors">
                <Layers className="h-4 w-4" />
              </button>
              <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-surface-elevated transition-colors">
                <User className="h-4 w-4" />
              </button>
              <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-surface-elevated transition-colors">
                <Link2 className="h-4 w-4" />
              </button>
            </div>

            <div className="relative">
              <button
                onClick={() => setIsModeDropdownOpen(!isModeDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-surface-elevated transition-colors"
              >
                <span>{selectedMode.name}</span>
                <ChevronDown className="h-3 w-3" />
              </button>

              {isModeDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsModeDropdownOpen(false)}
                  />
                  <div className="absolute bottom-full right-0 mb-2 w-56 bg-surface border border-border shadow-xl overflow-hidden z-20">
                    {executionModes.map((mode) => (
                      <button
                        key={mode.id}
                        onClick={() => {
                          onModeChange(mode)
                          setIsModeDropdownOpen(false)
                        }}
                        className={cn(
                          'w-full px-4 py-3 text-left hover:bg-surface-elevated transition-colors',
                          selectedMode.id === mode.id && 'bg-accent/10'
                        )}
                      >
                        <p className="text-sm font-medium text-foreground">{mode.name}</p>
                        <p className="text-xs text-muted-foreground">{mode.description}</p>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={onSubmit}
          disabled={!value.trim()}
          className={cn(
            'w-full max-w-4xl h-12 flex items-center justify-center gap-2 transition-colors mt-4',
            value.trim()
              ? 'bg-accent text-white hover:bg-accent-hover'
              : 'bg-surface-elevated text-muted-foreground cursor-not-allowed'
          )}
        >
          <span>Start Task</span>
          <ArrowRight className="h-4 w-4" />
        </button>

        <div className="flex flex-wrap justify-center gap-2 pt-6">
          {quickActions.map((action) => (
            <button
              key={action.id}
              className="flex items-center gap-2 px-4 py-2 bg-surface border border-border text-sm text-muted-foreground hover:text-foreground hover:border-accent/50 transition-colors"
              onClick={() => {
                onChange(`${action.name} `)
              }}
            >
              <action.icon className="h-4 w-4" />
              <span>{action.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
