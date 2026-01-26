'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import {
    MousePointer2,
    X,
    Maximize2,
    Minimize2,
    Loader2,
    AlertCircle,
    Keyboard,
} from 'lucide-react'

interface InteractiveControlProps {
    sessionId: string
    isOpen: boolean
    onClose: () => void
    className?: string
}

/**
 * Interactive Control Modal
 * Opens a noVNC session for direct user control of the browser.
 * Used for captcha solving, manual interventions, etc.
 */
export function InteractiveControl({
    sessionId,
    isOpen,
    onClose,
    className
}: InteractiveControlProps) {
    const iframeRef = useRef<HTMLIFrameElement>(null)
    const [status, setStatus] = useState<'loading' | 'connected' | 'error'>('loading')
    const [isFullscreen, setIsFullscreen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    // noVNC URL - port 6080 is the noVNC web interface
    const novncUrl = `http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:6080/vnc.html?autoconnect=true&resize=scale&quality=9`

    useEffect(() => {
        if (!isOpen) return

        setStatus('loading')

        // Check if noVNC is available
        const checkConnection = async () => {
            try {
                const response = await fetch(
                    `http://${window.location.hostname}:6080/`,
                    { method: 'HEAD', mode: 'no-cors' }
                )
                setStatus('connected')
            } catch {
                // no-cors mode always succeeds or throws, we assume connected
                setStatus('connected')
            }
        }

        const timer = setTimeout(checkConnection, 500)
        return () => clearTimeout(timer)
    }, [isOpen])

    // Fullscreen handling
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement)
        }
        document.addEventListener('fullscreenchange', handleFullscreenChange)
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }, [])

    const toggleFullscreen = () => {
        if (!containerRef.current) return
        if (!isFullscreen) {
            containerRef.current.requestFullscreen?.()
        } else {
            document.exitFullscreen?.()
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <Card
                ref={containerRef}
                className={cn(
                    "flex flex-col bg-surface overflow-hidden",
                    isFullscreen ? "w-full h-full rounded-none" : "w-[90vw] h-[85vh] max-w-6xl",
                    className
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-surface-elevated border-b border-border">
                    <div className="flex items-center gap-3">
                        <MousePointer2 className="w-5 h-5 text-accent" />
                        <div>
                            <h3 className="font-semibold text-foreground">Manual Control</h3>
                            <p className="text-xs text-muted-foreground">
                                Use mouse and keyboard to interact with the browser
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                            <Keyboard className="w-4 h-4 text-amber-500" />
                            <span className="text-xs text-amber-500 font-medium">
                                Click inside to enable keyboard
                            </span>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={toggleFullscreen}
                            className="h-8 w-8 p-0"
                        >
                            {isFullscreen ? (
                                <Minimize2 className="w-4 h-4" />
                            ) : (
                                <Maximize2 className="w-4 h-4" />
                            )}
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClose}
                            className="h-8 w-8 p-0 hover:bg-red-500/20 hover:text-red-500"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* noVNC Iframe */}
                <div className="flex-1 relative bg-black">
                    {status === 'loading' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black text-white">
                            <Loader2 className="w-10 h-10 animate-spin mb-3" />
                            <span className="text-sm">Connecting to VNC...</span>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black text-red-400">
                            <AlertCircle className="w-10 h-10 mb-3" />
                            <span className="text-sm">Failed to connect to VNC</span>
                            <span className="text-xs text-gray-400 mt-1">
                                Make sure the browser container is running on port 6080
                            </span>
                        </div>
                    )}

                    <iframe
                        ref={iframeRef}
                        src={novncUrl}
                        className={cn(
                            "w-full h-full border-0",
                            status !== 'connected' && "opacity-0"
                        )}
                        onLoad={() => setStatus('connected')}
                        onError={() => setStatus('error')}
                        allow="clipboard-read; clipboard-write"
                    />
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-4 py-2 bg-surface border-t border-border">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Session: {sessionId.slice(0, 8)}...</span>
                        <span className="flex items-center gap-1">
                            <div className={cn(
                                "w-2 h-2 rounded-full",
                                status === 'connected' ? "bg-green-500" : "bg-yellow-500 animate-pulse"
                            )} />
                            {status === 'connected' ? 'Connected' : 'Connecting...'}
                        </span>
                    </div>
                    <Button
                        variant="accent"
                        size="sm"
                        onClick={onClose}
                    >
                        Done - Resume Agent
                    </Button>
                </div>
            </Card>
        </div>
    )
}
