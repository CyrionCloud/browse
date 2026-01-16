'use client'

import { useState, useRef } from 'react'
import { Card } from '@/components/ui'
import { cn } from '@/lib/utils'
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  Loader2,
  ImageOff,
} from 'lucide-react'
import type { BrowserAction, SessionStatus } from '@autobrowse/shared'

interface ScreenshotViewerProps {
  screenshot: string | null
  actions: BrowserAction[]
  sessionStatus: SessionStatus
}

export function ScreenshotViewer({
  screenshot,
  actions,
  sessionStatus,
}: ScreenshotViewerProps) {
  const [zoom, setZoom] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 3))
  }

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5))
  }

  const handleDownload = () => {
    if (!screenshot) return

    const link = document.createElement('a')
    link.href = screenshot.startsWith('data:') ? screenshot : `data:image/png;base64,${screenshot}`
    link.download = `screenshot-${Date.now()}.png`
    link.click()
  }

  const toggleFullscreen = () => {
    if (!containerRef.current) return

    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.()
    } else {
      document.exitFullscreen?.()
    }
    setIsFullscreen(!isFullscreen)
  }

  const lastAction = actions[actions.length - 1]

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {sessionStatus === 'active' && (
            <span className="flex items-center gap-2 text-accent">
              <Loader2 className="h-4 w-4 animate-spin" />
              Live view
            </span>
          )}
          {lastAction && (
            <span className="text-xs">
              Last action: <span className="text-foreground">{lastAction.action_type}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleZoomOut}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-surface-elevated transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-xs text-muted-foreground min-w-[40px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-surface-elevated transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <div className="w-px h-4 bg-border mx-1" />
          <button
            onClick={toggleFullscreen}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-surface-elevated transition-colors"
            title="Fullscreen"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
          <button
            onClick={handleDownload}
            disabled={!screenshot}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-surface-elevated transition-colors disabled:opacity-50"
            title="Download screenshot"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-surface-elevated p-4"
      >
        {screenshot ? (
          <div
            className="relative inline-block transition-transform duration-200"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
          >
            <img
              src={screenshot.startsWith('data:') ? screenshot : `data:image/png;base64,${screenshot}`}
              alt="Browser screenshot"
              className="max-w-none shadow-lg"
              style={{ imageRendering: zoom > 1 ? 'pixelated' : 'auto' }}
            />

            {lastAction?.target_selector && (
              <div className="absolute inset-0 pointer-events-none">
                <div
                  className={cn(
                    'absolute border-2 border-accent bg-accent/10 transition-all',
                    sessionStatus === 'active' && 'animate-pulse'
                  )}
                  style={{
                    left: '50%',
                    top: '50%',
                    width: 100,
                    height: 30,
                    transform: 'translate(-50%, -50%)',
                  }}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
            <ImageOff className="h-16 w-16 mb-4 opacity-50" />
            <p className="text-sm font-medium">No screenshot available</p>
            <p className="text-xs mt-1">
              {sessionStatus === 'pending' && 'Start the session to capture screenshots'}
              {sessionStatus === 'active' && 'Waiting for first action...'}
              {sessionStatus === 'completed' && 'Session completed without screenshots'}
              {sessionStatus === 'failed' && 'Session failed before capturing'}
              {sessionStatus === 'cancelled' && 'Session was cancelled'}
              {sessionStatus === 'paused' && 'Session is paused'}
            </p>
          </div>
        )}
      </div>
    </Card>
  )
}
