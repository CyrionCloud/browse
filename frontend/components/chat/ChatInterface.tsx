'use client'

import { useState, useRef, useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { Button, Input } from '@/components/ui'
import { Send, Bot, User, Loader2 } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import type { ChatMessage } from '@autobrowse/shared'

interface MessageBubbleProps {
  message: ChatMessage
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div
      className={cn(
        'flex w-full gap-3',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      <div
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full',
          isUser ? 'bg-accent' : 'bg-surface-elevated border border-border'
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-white" />
        ) : (
          <Bot className="h-4 w-4 text-accent" />
        )}
      </div>

      <div
        className={cn(
          'flex max-w-[75%] flex-col gap-1',
          isUser ? 'items-end' : 'items-start'
        )}
      >
        <div
          className={cn(
            'rounded-2xl px-4 py-2 text-sm',
            isUser
              ? 'bg-accent text-white rounded-br-md'
              : 'bg-surface-elevated text-foreground border border-border rounded-bl-md'
          )}
        >
          {message.content}
        </div>
        <span className="text-xs text-muted-foreground">
          {formatDate(message.created_at)}
        </span>
      </div>
    </div>
  )
}

interface ChatInputProps {
  onSend: (content: string) => void
  disabled?: boolean
  isLoading?: boolean
}

function ChatInput({ onSend, disabled, isLoading }: ChatInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = () => {
    if (value.trim() && !isLoading) {
      onSend(value.trim())
      setValue('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [value])

  return (
    <div className="flex items-end gap-2 border-t border-border p-4">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Describe what you want to automate..."
        disabled={disabled || isLoading}
        className="flex-1 resize-none rounded-lg border border-border bg-input px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:opacity-50"
        rows={1}
      />
      <Button
        onClick={handleSubmit}
        disabled={disabled || isLoading || !value.trim()}
        size="icon"
        className="shrink-0"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </div>
  )
}

interface ChatInterfaceProps {
  onSendMessage: (content: string) => Promise<void>
  disabled?: boolean
}

export function ChatInterface({ onSendMessage, disabled }: ChatInterfaceProps) {
  const { messages, currentSession, isLoading } = useAppStore()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async (content: string) => {
    await onSendMessage(content)
  }

  const sessionMessages = currentSession
    ? messages.filter((m) => m.session_id === currentSession.id)
    : messages

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-accent" />
          <span className="font-medium text-foreground">AutoBrowse AI</span>
        </div>
        {currentSession && (
          <span className="text-xs text-muted-foreground">
            Session: {currentSession.task_description.slice(0, 30)}...
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {sessionMessages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Bot className="h-12 w-12 text-muted mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Welcome to AutoBrowse
            </h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Describe what you want to automate in natural language, and I&apos;ll
              help you create and run browser automation tasks.
            </p>
          </div>
        ) : (
          sessionMessages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}
        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">AI is thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <ChatInput
        onSend={handleSend}
        disabled={disabled}
        isLoading={isLoading}
      />
    </div>
  )
}
