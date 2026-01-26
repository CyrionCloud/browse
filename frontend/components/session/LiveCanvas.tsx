'use client'

import { useEffect, useRef, useState } from 'react'
import { Card } from '@/components/ui'
import { cn } from '@/lib/utils'
import {
    Maximize2,
    Minimize2,
    Loader2,
    Monitor,
    WifiOff,
    Signal,
} from 'lucide-react'
import { useWebSocket } from '@/hooks/useWebSocket'

interface LiveCanvasProps {
    sessionId: string
    className?: string
    quality?: number
}

export function LiveCanvas({
    sessionId,
    className,
    quality = 90
}: LiveCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [fps, setFps] = useState(0)
    const frameCount = useRef(0)
    const lastFrameTime = useRef(Date.now())
    const { socket } = useWebSocket()

    // Setup Socket.IO listener for binary frames
    useEffect(() => {
        if (!socket || !sessionId) return

        console.log(`[LiveCanvas] Starting stream for ${sessionId}`)
        setConnectionState('connecting')

        // Request stream start
        socket.emit('start_stream', { sessionId })

        const handleFrame = (data: string | ArrayBuffer) => {
            // Debug: Confirm we are receiving binary data
            if (data instanceof ArrayBuffer) {
                // console.log('🔹 Received Binary Frame:', data.byteLength, 'bytes')
            } else {
                console.warn('🔸 Received Text Frame (Base64) - Optimization inactive')
            }

            const canvas = canvasRef.current
            if (!canvas) return

            const ctx = canvas.getContext('2d')
            if (!ctx) return

            const img = new Image()
            let objectUrl: string | null = null

            img.onload = () => {
                // Resize canvas to match image if needed
                if (canvas.width !== img.width || canvas.height !== img.height) {
                    canvas.width = img.width
                    canvas.height = img.height
                }
                ctx.drawImage(img, 0, 0)

                // Cleanup ObjectURL
                if (objectUrl) {
                    URL.revokeObjectURL(objectUrl)
                }

                // Update FPS
                frameCount.current++
                const now = Date.now()
                if (now - lastFrameTime.current >= 1000) {
                    setFps(frameCount.current)
                    frameCount.current = 0
                    lastFrameTime.current = now
                }

                if (connectionState !== 'connected') {
                    setConnectionState('connected')
                }
            }

            // Handle both Binary (Optimized) and Base64 (Legacy)
            if (data instanceof ArrayBuffer) {
                const blob = new Blob([data], { type: 'image/jpeg' })
                objectUrl = URL.createObjectURL(blob)
                img.src = objectUrl
            } else {
                img.src = `data:image/jpeg;base64,${data}`
            }
        }

        const handleError = (data: any) => {
            console.error('[LiveCanvas] Stream error:', data)
            setConnectionState('disconnected')
        }

        socket.on('stream_frame', handleFrame)
        socket.on('stream_error', handleError)

        return () => {
            console.log(`[LiveCanvas] Stopping stream for ${sessionId}`)
            socket.emit('stop_stream', { sessionId })
            socket.off('stream_frame', handleFrame)
            socket.off('stream_error', handleError)
        }
    }, [socket, sessionId])

    // Toggle fullscreen
    const toggleFullscreen = () => {
        if (!containerRef.current) return

        if (!isFullscreen) {
            containerRef.current.requestFullscreen?.()
        } else {
            document.exitFullscreen?.()
        }
    }

    // Handle fullscreen change events
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement)
        }
        document.addEventListener('fullscreenchange', handleFullscreenChange)
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }, [])

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
                    <span className="font-medium text-foreground">CDP Stream</span>

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
                                <span className="text-xs text-green-500">Live ({fps} FPS)</span>
                            </>
                        )}
                        {connectionState === 'disconnected' && (
                            <>
                                <WifiOff className="h-3 w-3 text-red-500" />
                                <span className="text-xs text-red-500">Disconnected</span>
                            </>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <div className="flex items-center gap-1 px-2 py-1 bg-surface-elevated rounded text-xs text-muted-foreground mr-2">
                        <Signal className="h-3 w-3" />
                        <span>Quality: {quality}%</span>
                    </div>

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

            {/* Canvas View */}
            <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
                <canvas
                    ref={canvasRef}
                    className={cn(
                        "max-w-full max-h-full object-contain shadow-2xl",
                        // Crisp rendering for pixel art or UI
                        "rendering-pixelated"
                    )}
                />

                {connectionState === 'connecting' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <div className="flex flex-col items-center gap-2">
                            <Loader2 className="h-8 w-8 animate-spin text-accent" />
                            <p className="text-sm text-muted-foreground">Initializing CDP Stream...</p>
                        </div>
                    </div>
                )}
            </div>
        </Card>
    )
}
