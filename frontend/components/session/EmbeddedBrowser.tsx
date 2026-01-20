'use client'

import { useEffect, useRef, useState } from 'react'
import { Card } from '@/components/ui'
import { cn } from '@/lib/utils'
import {
    Maximize2,
    Minimize2,
    RefreshCw,
    Loader2,
    AlertCircle,
    Monitor,
    MousePointer,
} from 'lucide-react'

interface EmbeddedBrowserProps {
    /** noVNC URL for the browser stream */
    novncUrl: string
    /** Optional session ID for debugging */
    sessionId?: string
    /** Callback when browser is ready */
    onReady?: () => void
    /** Callback on connection error */
    onError?: (error: string) => void
    /** Whether browser is interactive (mouse/keyboard enabled) */
    interactive?: boolean
    /** Custom className */
    className?: string
}

type ConnectionState = 'connecting' | 'connected' | 'error' | 'disconnected'

export function EmbeddedBrowser({
    novncUrl,
    sessionId,
    onReady,
    onError,
    interactive = true,
    className,
}: EmbeddedBrowserProps) {
    const iframeRef = useRef<HTMLIFrameElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [connectionState, setConnectionState] = useState<ConnectionState>('connecting')
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    // Build noVNC URL with parameters
    const buildUrl = () => {
        const url = new URL(novncUrl)
        url.searchParams.set('autoconnect', 'true')
        url.searchParams.set('resize', 'scale')
        url.searchParams.set('reconnect', 'true')
        url.searchParams.set('reconnect_delay', '1000')
        if (!interactive) {
            url.searchParams.set('view_only', 'true')
        }
        return url.toString()
    }

    // Handle iframe load
    const handleLoad = () => {
        setConnectionState('connected')
        setErrorMessage(null)
        onReady?.()
    }

    // Handle iframe error
    const handleError = () => {
        setConnectionState('error')
        const msg = 'Failed to connect to browser stream'
        setErrorMessage(msg)
        onError?.(msg)
    }

    // Toggle fullscreen
    const toggleFullscreen = () => {
        if (!containerRef.current) return

        if (!isFullscreen) {
            containerRef.current.requestFullscreen?.()
        } else {
            document.exitFullscreen?.()
        }
    }

    // Listen for fullscreen changes
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement)
        }
        document.addEventListener('fullscreenchange', handleFullscreenChange)
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }, [])

    // Retry connection
    const handleRetry = () => {
        setConnectionState('connecting')
        setErrorMessage(null)
        if (iframeRef.current) {
            iframeRef.current.src = buildUrl()
        }
    }

    return (
        <Card
            ref={containerRef}
            className={cn(
                "flex flex-col overflow-hidden bg-[#1a1a1a]",
                isFullscreen ? "fixed inset-0 z-50 rounded-none" : "h-full",
                className
            )}
        >
            {/* Toolbar */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-surface">
                <div className="flex items-center gap-2 text-sm">
                    <Monitor className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-foreground">Live Browser</span>

                    {/* Connection Status */}
                    <div className="flex items-center gap-1.5 ml-2">
                        {connectionState === 'connecting' && (
                            <>
                                <Loader2 className="h-3 w-3 animate-spin text-yellow-500" />
                                <span className="text-xs text-yellow-500">Connecting...</span>
                            </>
                        )}
                        {connectionState === 'connected' && (
                            <>
                                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-xs text-green-500">Connected</span>
                            </>
                        )}
                        {connectionState === 'error' && (
                            <>
                                <AlertCircle className="h-3 w-3 text-red-500" />
                                <span className="text-xs text-red-500">Error</span>
                            </>
                        )}
                    </div>

                    {interactive && connectionState === 'connected' && (
                        <div className="flex items-center gap-1 ml-2 text-xs text-muted-foreground">
                            <MousePointer className="h-3 w-3" />
                            <span>Interactive</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={handleRetry}
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-surface-elevated transition-colors rounded"
                        title="Reconnect"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </button>
                    <button
                        onClick={toggleFullscreen}
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-surface-elevated transition-colors rounded"
                        title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                    >
                        {isFullscreen ? (
                            <Minimize2 className="h-4 w-4" />
                        ) : (
                            <Maximize2 className="h-4 w-4" />
                        )}
                    </button>
                </div>
            </div>

            {/* Browser View */}
            <div className="flex-1 relative">
                {/* Loading / Error Overlay */}
                {(connectionState === 'connecting' || connectionState === 'error') && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1a1a1a] z-10">
                        {connectionState === 'connecting' && (
                            <>
                                <Loader2 className="h-12 w-12 animate-spin text-accent mb-4" />
                                <p className="text-muted-foreground">Connecting to browser...</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {sessionId && `Session: ${sessionId.slice(0, 8)}...`}
                                </p>
                            </>
                        )}
                        {connectionState === 'error' && (
                            <>
                                <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                                <p className="text-red-400 font-medium">Connection Failed</p>
                                <p className="text-sm text-muted-foreground mt-1 max-w-md text-center">
                                    {errorMessage || 'Unable to connect to the browser stream'}
                                </p>
                                <button
                                    onClick={handleRetry}
                                    className="mt-4 px-4 py-2 bg-accent text-accent-foreground rounded-md hover:bg-accent/90 transition-colors"
                                >
                                    Try Again
                                </button>
                            </>
                        )}
                    </div>
                )}

                {/* noVNC iframe */}
                <iframe
                    ref={iframeRef}
                    src={buildUrl()}
                    className={cn(
                        "w-full h-full border-0",
                        connectionState !== 'connected' && "invisible"
                    )}
                    onLoad={handleLoad}
                    onError={handleError}
                    allow="clipboard-read; clipboard-write"
                    sandbox="allow-same-origin allow-scripts allow-forms"
                />
            </div>
        </Card>
    )
}
