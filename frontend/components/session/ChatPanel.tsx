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
    Paperclip,
    Sparkles,
    X,
} from 'lucide-react'
import axios from 'axios'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api'

interface ChatMessage {
    id: string
    role: 'user' | 'assistant' | 'system'
    content: string
    timestamp: Date
}

interface Skill {
    id: string
    name: string
    icon: string
    category: string
    description: string
}

interface SelectedSkill {
    skill: Skill
    context?: string
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
    const [showSkillsMenu, setShowSkillsMenu] = useState(false)
    const [skills, setSkills] = useState<Skill[]>([])
    const [selectedSkills, setSelectedSkills] = useState<SelectedSkill[]>([])
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    useEffect(() => {
        loadSkills()
    }, [])

    const loadSkills = async () => {
        try {
            const { data } = await axios.get(`${API_BASE}/skills/user/all`)
            setSkills(data.filter((s: any) => s.is_active))
        } catch (error) {
            console.error('Failed to load skills:', error)
        }
    }

    const handleSelectSkill = (skill: Skill) => {
        if (!selectedSkills.find(s => s.skill.id === skill.id)) {
            setSelectedSkills([...selectedSkills, { skill }])
        }
        setShowSkillsMenu(false)
    }

    const handleRemoveSkill = (skillId: string) => {
        setSelectedSkills(selectedSkills.filter(s => s.skill.id !== skillId))
    }

    const handleSkillContextChange = (skillId: string, context: string) => {
        setSelectedSkills(selectedSkills.map(s =>
            s.skill.id === skillId ? { ...s, context } : s
        ))
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setUploadedFiles([...uploadedFiles, ...Array.from(e.target.files)])
        }
    }

    const handleRemoveFile = (index: number) => {
        setUploadedFiles(uploadedFiles.filter((_, i) => i !== index))
    }

    const handleSend = async () => {
        if (!inputValue.trim() || sessionStatus !== 'active') return

        // Build message with skills and file context
        let fullMessage = inputValue.trim()

        if (selectedSkills.length > 0) {
            const skillsContext = selectedSkills.map(s =>
                `Use skill: ${s.skill.name}${s.context ? ` - ${s.context}` : ''}`
            ).join('\n')
            fullMessage = `${skillsContext}\n\n${fullMessage}`
        }

        if (uploadedFiles.length > 0) {
            fullMessage += `\n\nAttached files: ${uploadedFiles.map(f => f.name).join(', ')}`
        }

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: inputValue.trim(), // Show original in UI
            timestamp: new Date(),
        }

        setMessages((prev) => [...prev, userMessage])
        setInputValue('')
        setSelectedSkills([])
        setUploadedFiles([])
        setIsTyping(true)

        onSendMessage?.(fullMessage)

        try {
            const result = await sessionsApi.intervene(sessionId, fullMessage)

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

            {/* Selected Skills Display */}
            {selectedSkills.length > 0 && (
                <div className="px-3 py-2 border-t border-border space-y-2">
                    {selectedSkills.map((selectedSkill) => (
                        <div key={selectedSkill.skill.id} className="flex items-center gap-2">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30">
                                <span className="text-sm">{selectedSkill.skill.icon}</span>
                                <span className="text-sm font-medium">{selectedSkill.skill.name}</span>
                                <button
                                    onClick={() => handleRemoveSkill(selectedSkill.skill.id)}
                                    className="text-blue-300 hover:text-blue-100"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                            <input
                                type="text"
                                placeholder="Add context (optional)..."
                                value={selectedSkill.context || ''}
                                onChange={(e) => handleSkillContextChange(selectedSkill.skill.id, e.target.value)}
                                className="flex-1 bg-surface-elevated text-foreground placeholder-muted-foreground text-sm px-3 py-1.5 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-accent"
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Uploaded Files Display */}
            {uploadedFiles.length > 0 && (
                <div className="px-3 py-2 border-t border-border">
                    <div className="flex flex-wrap gap-2">
                        {uploadedFiles.map((file, index) => (
                            <div key={index} className="flex items-center gap-2 px-3 py-1.5 bg-surface-elevated rounded-lg border border-border">
                                <Paperclip className="w-3 h-3 text-muted-foreground" />
                                <span className="text-sm text-foreground">{file.name}</span>
                                <button
                                    onClick={() => handleRemoveFile(index)}
                                    className="text-muted-foreground hover:text-foreground"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Input */}
            <div className="p-3 border-t border-border">
                <div className="flex items-center gap-2">
                    {/* File Upload Button (1st icon) */}
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={sessionStatus !== 'active'}
                        className="p-2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                        title="Attach files"
                    >
                        <Paperclip className="h-4 w-4" />
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={handleFileUpload}
                    />

                    {/* Skills Selector Button (2nd icon) */}
                    <div className="relative">
                        <button
                            onClick={() => setShowSkillsMenu(!showSkillsMenu)}
                            disabled={sessionStatus !== 'active'}
                            className="p-2 text-muted-foreground hover:text-accent transition-colors disabled:opacity-50"
                            title="Select skill"
                        >
                            <Sparkles className="h-4 w-4" />
                        </button>

                        {/* Skills Dropdown */}
                        {showSkillsMenu && (
                            <div className="absolute bottom-full left-0 mb-2 w-64 bg-surface border border-border rounded-lg shadow-xl max-h-64 overflow-y-auto z-50">
                                <div className="p-2 border-b border-border">
                                    <p className="text-xs font-medium text-foreground">Select a Skill</p>
                                </div>
                                {skills.length > 0 ? (
                                    skills.map((skill) => (
                                        <button
                                            key={skill.id}
                                            onClick={() => handleSelectSkill(skill)}
                                            className="w-full flex items-center gap-2 p-2 hover:bg-surface-elevated transition-colors text-left"
                                            disabled={selectedSkills.some(s => s.skill.id === skill.id)}
                                        >
                                            <span className="text-lg">{skill.icon}</span>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-foreground">{skill.name}</p>
                                                <p className="text-xs text-muted-foreground truncate">{skill.category}</p>
                                            </div>
                                            {selectedSkills.some(s => s.skill.id === skill.id) && (
                                                <span className="text-xs text-accent">✓</span>
                                            )}
                                        </button>
                                    ))
                                ) : (
                                    <div className="p-4 text-center text-sm text-muted-foreground">
                                        No skills available
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Message Input */}
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

                    {/* Send Button */}
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
