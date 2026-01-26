'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Card, Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import { Loader2, AlertCircle, Wifi, MousePointer2, RefreshCw } from 'lucide-react'

interface WebRTCPlayerProps {
    url?: string
    className?: string
    onTakeControl?: () => void
}

// WebRTC Player using WebSocket Signaling (go2rtc protocol)
// Connects to go2rtc on port 1984 for ultra-low latency streaming
export function WebRTCPlayer({
    url,
    className,
    onTakeControl
}: WebRTCPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting')
    const [errorMessage, setErrorMessage] = useState<string>('')
    const pcRef = useRef<RTCPeerConnection | null>(null)
    const wsRef = useRef<WebSocket | null>(null)

    const connect = useCallback(async () => {
        // Cleanup previous connection
        if (pcRef.current) {
            pcRef.current.close()
            pcRef.current = null
        }
        if (wsRef.current) {
            wsRef.current.close()
            wsRef.current = null
        }

        setStatus('connecting')
        setErrorMessage('')

        try {
            // Build WebSocket URL - always use current browser hostname
            // The backend returns ws://localhost:1984/... which won't work remotely
            // So we rebuild the URL with the current hostname
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
            const host = window.location.hostname
            const port = 1984

            // Extract path from URL or use default
            let path = '/api/ws?src=stream'
            if (url) {
                try {
                    // Try to parse as URL and extract path
                    const urlObj = new URL(url.startsWith('ws') ? url : `ws://dummy${url}`)
                    path = urlObj.pathname + urlObj.search
                } catch {
                    // If parsing fails, use the url as-is if it starts with /
                    if (url.startsWith('/')) {
                        path = url
                    }
                }
            }

            const wsUrl = `${protocol}//${host}:${port}${path}`
            console.log('[WebRTC] Connecting to:', wsUrl)

            const ws = new WebSocket(wsUrl)
            wsRef.current = ws

            ws.onopen = async () => {
                console.log('[WebRTC] WS Connected')

                // Create PeerConnection with multiple STUN servers for reliability
                const pc = new RTCPeerConnection({
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' },
                    ]
                })
                pcRef.current = pc

                // Add video transceiver (receive only)
                pc.addTransceiver('video', { direction: 'recvonly' })

                // Handle incoming track
                pc.ontrack = (event) => {
                    console.log('[WebRTC] Track received:', event.track.kind)
                    if (event.track.kind === 'video' && videoRef.current) {
                        videoRef.current.srcObject = event.streams[0]
                        setStatus('connected')
                    }
                }

                // Send ICE candidates to server
                pc.onicecandidate = (event) => {
                    if (event.candidate && ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({
                            type: 'webrtc/candidate',
                            value: event.candidate.candidate
                        }))
                    }
                }

                pc.oniceconnectionstatechange = () => {
                    console.log('[WebRTC] ICE state:', pc.iceConnectionState)
                    if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
                        setStatus('error')
                        setErrorMessage('ICE connection failed')
                    }
                }

                // Create and send offer
                const offer = await pc.createOffer()
                await pc.setLocalDescription(offer)

                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: 'webrtc/offer',
                        value: offer.sdp
                    }))
                }
            }

            ws.onmessage = (event) => {
                const msg = JSON.parse(event.data)

                switch (msg.type) {
                    case 'webrtc/candidate':
                        if (pcRef.current?.remoteDescription) {
                            pcRef.current.addIceCandidate({
                                candidate: msg.value,
                                sdpMid: '0'
                            }).catch(e => console.warn('ICE Error:', e))
                        }
                        break

                    case 'webrtc/answer':
                        pcRef.current?.setRemoteDescription({
                            type: 'answer',
                            sdp: msg.value
                        }).catch(e => {
                            console.error('Remote Desc Error:', e)
                            setStatus('error')
                            setErrorMessage('Failed to set remote description')
                        })
                        break

                    case 'error':
                        console.error('[WebRTC] Server Error:', msg.value)
                        setStatus('error')
                        setErrorMessage(msg.value || 'Server error')
                        break
                }
            }

            ws.onerror = () => {
                console.error('[WebRTC] WS Error')
                setStatus('error')
                setErrorMessage('WebSocket connection failed')
            }

            ws.onclose = (e) => {
                console.log('[WebRTC] WS Closed:', e.code, e.reason)
                if (status !== 'connected') {
                    setStatus('error')
                    setErrorMessage(`Connection closed: ${e.reason || 'Unknown reason'}`)
                }
            }

        } catch (err) {
            console.error('[WebRTC] Setup failed:', err)
            setStatus('error')
            setErrorMessage(err instanceof Error ? err.message : 'Setup failed')
        }
    }, [url])

    useEffect(() => {
        const timer = setTimeout(connect, 100)

        return () => {
            clearTimeout(timer)
            if (pcRef.current) pcRef.current.close()
            if (wsRef.current) wsRef.current.close()
        }
    }, [connect])

    return (
        <Card className={cn("relative overflow-hidden bg-black flex flex-col", className)}>
            {/* Toolbar */}
            <div className="flex items-center justify-between px-3 py-2 bg-surface border-b border-border">
                <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-foreground">WebRTC Stream</span>
                    {status === 'connecting' && (
                        <span className="flex items-center gap-1 text-yellow-500 text-xs">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Connecting...
                        </span>
                    )}
                    {status === 'connected' && (
                        <span className="flex items-center gap-1 text-green-500 text-xs">
                            <Wifi className="w-3 h-3" />
                            Live
                        </span>
                    )}
                    {status === 'error' && (
                        <span className="flex items-center gap-1 text-red-500 text-xs">
                            <AlertCircle className="w-3 h-3" />
                            Error
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={connect}
                        title="Reconnect"
                        className="h-7 px-2"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                    </Button>
                    {onTakeControl && (
                        <Button
                            variant="accent"
                            size="sm"
                            onClick={onTakeControl}
                            className="h-7 gap-1"
                        >
                            <MousePointer2 className="w-3.5 h-3.5" />
                            Take Control
                        </Button>
                    )}
                </div>
            </div>

            {/* Video */}
            <div className="flex-1 relative">
                <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    controls={false}
                    className="w-full h-full object-contain"
                />

                {/* Status Overlays */}
                {status === 'connecting' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm text-white">
                        <Loader2 className="w-10 h-10 animate-spin mb-3" />
                        <span className="text-sm">Connecting to stream...</span>
                        <span className="text-xs text-gray-400 mt-1">Port 1984 (go2rtc)</span>
                    </div>
                )}

                {status === 'error' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-red-400">
                        <AlertCircle className="w-10 h-10 mb-3" />
                        <span className="text-sm font-medium">Connection Failed</span>
                        {errorMessage && (
                            <span className="text-xs text-gray-400 mt-1 max-w-[80%] text-center">
                                {errorMessage}
                            </span>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={connect}
                            className="mt-4"
                        >
                            <RefreshCw className="w-3.5 h-3.5 mr-2" />
                            Retry
                        </Button>
                    </div>
                )}
            </div>
        </Card>
    )
}
