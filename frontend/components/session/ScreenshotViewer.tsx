'use client'

import { useState, useRef, useEffect } from 'react'
import { Card } from '@/components/ui'
import { cn } from '@/lib/utils'
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Download,
  Loader2,
  ImageOff,
  Globe,
  Lock,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  X,
  Minus,
  Square,
  MousePointer2,
} from 'lucide-react'
import type { BrowserAction, SessionStatus } from '@autobrowse/shared'

interface ScreenshotViewerProps {
  screenshot: string | null
  actions: BrowserAction[]
  sessionStatus: SessionStatus
  currentUrl?: string
  pageTitle?: string
  onTakeControl?: () => void
}

export function ScreenshotViewer({
  screenshot,
  actions,
  sessionStatus,
  currentUrl = 'about:blank',
  pageTitle = 'New Tab',
  onTakeControl,
}: ScreenshotViewerProps) {
  const [zoom, setZoom] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [fitToScreen, setFitToScreen] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const handleZoomIn = () => {
    setFitToScreen(false)
    setZoom((prev) => Math.min(prev + 0.25, 3))
  }

  const handleZoomOut = () => {
    setFitToScreen(false)
    setZoom((prev) => Math.max(prev - 0.25, 0.25))
  }

  const handleFitToScreen = () => {
    setFitToScreen(true)
    setZoom(1)
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
  }

  const lastAction = actions[actions.length - 1]

  // Extract URL from lastAction if available
  const displayUrl = lastAction?.input_value || currentUrl

  return (
    <Card
      ref={containerRef}
      className={cn(
        "flex flex-col overflow-hidden bg-[#202124]",
        isFullscreen ? "fixed inset-0 z-50 rounded-none" : "h-full"
      )}
    >
      {/* Browser Chrome - Window Controls */}
      <div className="flex items-center justify-between bg-[#35363a] px-2 py-1 border-b border-[#4a4b4f]">
        {/* Tabs Area */}
        <div className="flex items-center gap-1 flex-1">
          <div className="flex items-center bg-[#202124] rounded-t-lg px-3 py-1.5 max-w-[200px]">
            <Globe className="h-3.5 w-3.5 text-gray-400 mr-2 flex-shrink-0" />
            <span className="text-xs text-gray-200 truncate">{pageTitle || 'New Tab'}</span>
            <X className="h-3 w-3 text-gray-500 ml-2 flex-shrink-0 hover:text-gray-300" />
          </div>
        </div>

        {/* Window Controls */}
        <div className="flex items-center gap-1">
          <button className="p-1 hover:bg-[#4a4b4f] rounded">
            <Minus className="h-3 w-3 text-gray-400" />
          </button>
          <button className="p-1 hover:bg-[#4a4b4f] rounded">
            <Square className="h-3 w-3 text-gray-400" />
          </button>
          <button className="p-1 hover:bg-red-600 rounded">
            <X className="h-3 w-3 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Browser Chrome - Address Bar */}
      <div className="flex items-center gap-2 bg-[#35363a] px-2 py-1.5 border-b border-[#4a4b4f]">
        {/* Navigation */}
        <div className="flex items-center gap-0.5">
          <button className="p-1.5 hover:bg-[#4a4b4f] rounded text-gray-400">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button className="p-1.5 hover:bg-[#4a4b4f] rounded text-gray-400">
            <ArrowRight className="h-4 w-4" />
          </button>
          <button className="p-1.5 hover:bg-[#4a4b4f] rounded text-gray-400">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {/* URL Bar */}
        <div className="flex-1 flex items-center bg-[#202124] rounded-full px-3 py-1.5">
          <Lock className="h-3.5 w-3.5 text-gray-500 mr-2" />
          <span className="text-sm text-gray-300 truncate">{displayUrl}</span>
        </div>
      </div>

      {/* Screenshot Controls */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-surface">
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
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-surface-elevated transition-colors rounded"
            title="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-xs text-muted-foreground min-w-[40px] text-center">
            {fitToScreen ? 'Fit' : `${Math.round(zoom * 100)}%`}
          </span>
          <button
            onClick={handleZoomIn}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-surface-elevated transition-colors rounded"
            title="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <div className="w-px h-4 bg-border mx-1" />
          <button
            onClick={handleFitToScreen}
            className={cn(
              "p-2 hover:bg-surface-elevated transition-colors rounded",
              fitToScreen ? "text-accent" : "text-muted-foreground hover:text-foreground"
            )}
            title="Fit to screen"
          >
            <Minimize2 className="h-4 w-4" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-surface-elevated transition-colors rounded"
            title="Fullscreen"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
          <button
            onClick={handleDownload}
            disabled={!screenshot}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-surface-elevated transition-colors disabled:opacity-50 rounded"
            title="Download screenshot"
          >
            <Download className="h-4 w-4" />
          </button>
          {onTakeControl && (
            <>
              <div className="w-px h-4 bg-border mx-1" />
              <button
                onClick={onTakeControl}
                className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-amber-500 bg-amber-500/10 hover:bg-amber-500/20 rounded transition-colors"
                title="Take manual control"
              >
                <MousePointer2 className="h-3.5 w-3.5" />
                Take Control
              </button>
            </>
          )}
        </div>
      </div>

      {/* Screenshot Display - Contain within canvas */}
      <div className="flex-1 overflow-hidden bg-[#1a1a1a] relative">
        {screenshot ? (
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center p-4",
              !fitToScreen && "overflow-auto"
            )}
            style={!fitToScreen ? { transform: `scale(${zoom})`, transformOrigin: 'center' } : undefined}
          >
            <img
              ref={imageRef}
              src={screenshot.startsWith('data:') ? screenshot : `data:image/png;base64,${screenshot}`}
              alt="Browser screenshot"
              className={cn(
                "shadow-2xl border border-[#333]",
                fitToScreen ? "max-w-full max-h-full object-contain" : ""
              )}
              style={{ imageRendering: zoom > 1.5 ? 'pixelated' : 'auto' }}
            />

            {lastAction?.target_selector && sessionStatus === 'active' && (
              <div className="absolute inset-0 pointer-events-none">
                <div
                  className="absolute border-2 border-accent bg-accent/10 animate-pulse rounded"
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
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
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

