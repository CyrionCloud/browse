'use client'

import { useState, useRef, useEffect } from 'react'
import { Card } from '@/components/ui'
import { cn } from '@/lib/utils'
import { sessionsApi } from '@/lib/api'
import {
    Send,
    Bot,
    User,
    Loader2,
} from 'lucide-react'

interface ChatMessage {
    id: string
    role: 'user' | 'assistant' | 'system'
    content: string
    timestamp: Date
}

interface ChatPanelProps {
    sessionId: string
    sessionStatus: string
    onSendMessage?: (message: string) => void
    className?: string
}

export function ChatPanel({
    sessionId,
    sessionStatus,
    onSendMessage,
    className,
}: ChatPanelProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: '1',
            role: 'system',
            content: 'Agent is ready. Send a message to change the agent\'s course of action.',
            timestamp: new Date(),
        },
    ])
    const [inputValue, setInputValue] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const handleSend = async () => {
        if (!inputValue.trim() || sessionStatus !== 'active') return

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: inputValue.trim(),
            timestamp: new Date(),
        }

        setMessages((prev) => [...prev, userMessage])
        setInputValue('')
        setIsTyping(true)

        onSendMessage?.(inputValue.trim())

        try {
            // Send intervention to running agent
            const result = await sessionsApi.intervene(sessionId, userMessage.content)

            const botMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `✅ ${result.message}`,
                timestamp: new Date(),
            }
            setMessages((prev) => [...prev, botMessage])
        } catch (error: any) {
            const errorMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `❌ ${error.message || 'Failed to send intervention'}`,
                timestamp: new Date(),
            }
            setMessages((prev) => [...prev, errorMessage])
        } finally {
            setIsTyping(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    // Add agent messages when status changes
    useEffect(() => {
        if (sessionStatus === 'active') {
            setMessages((prev) => [
                ...prev,
                {
                    id: Date.now().toString(),
                    role: 'system',
                    content: 'Task started. Browsing...',
                    timestamp: new Date(),
                },
            ])
        } else if (sessionStatus === 'completed') {
            setMessages((prev) => [
                ...prev,
                {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: '✅ Task completed successfully!',
                    timestamp: new Date(),
                },
            ])
        } else if (sessionStatus === 'failed') {
            setMessages((prev) => [
                ...prev,
                {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: '❌ Task failed. Please check the error details.',
                    timestamp: new Date(),
                },
            ])
        }
    }, [sessionStatus])

    return (
        <Card className={cn('flex flex-col h-full', className)}>
            {/* Header */}
            <div className="flex items-center gap-2 p-3 border-b border-border">
                <Bot className="h-5 w-5 text-accent" />
                <span className="text-sm font-medium text-foreground">Agent Chat</span>
                {isTyping && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Typing...
                    </span>
                )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={cn(
                            'flex gap-2',
                            message.role === 'user' ? 'justify-end' : 'justify-start'
                        )}
                    >
                        {message.role !== 'user' && (
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center">
                                <Bot className="h-3.5 w-3.5 text-accent" />
                            </div>
                        )}
                        <div
                            className={cn(
                                'max-w-[80%] px-3 py-2 rounded-lg text-sm',
                                message.role === 'user'
                                    ? 'bg-accent text-white'
                                    : message.role === 'system'
                                        ? 'bg-surface-elevated text-muted-foreground italic'
                                        : 'bg-surface-elevated text-foreground'
                            )}
                        >
                            {message.content}
                        </div>
                        {message.role === 'user' && (
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent flex items-center justify-center">
                                <User className="h-3.5 w-3.5 text-white" />
                            </div>
                        )}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-border">
                <div className="flex items-center gap-2">
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={sessionStatus === 'active' ? 'Type a message...' : 'Start session to chat'}
                        disabled={sessionStatus !== 'active'}
                        className="flex-1 bg-surface-elevated text-foreground placeholder-muted-foreground text-sm px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!inputValue.trim() || sessionStatus !== 'active'}
                        className="p-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </Card>
    )
}
