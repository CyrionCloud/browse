'use client'

import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { ChatInterface } from '@/components/chat/ChatInterface'
import { SessionList } from '@/components/session/SessionList'
import { SettingsPanel } from '@/components/settings/SettingsPanel'
import { useAuth } from '@/hooks/useAuth'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useAppStore } from '@/store/useAppStore'
import { sessionsApi, chatApi, authApi } from '@/lib/api'
import type { BrowserSession, AgentConfig, ChatMessage } from '@autobrowse/shared'
import { Button, Card, Input } from '@/components/ui'
import { Plus, Loader2 } from 'lucide-react'

const defaultAgentConfig: AgentConfig = {
  model: 'claude-sonnet-4.5',
  maxSteps: 50,
  outputType: 'streaming',
  highlightElements: true,
  hashMode: false,
  thinking: true,
  vision: true,
  profile: null,
  proxyLocation: '',
  allowedDomains: [],
  secrets: {},
  enabledSkills: [],
}

export default function DashboardPage() {
  const { user, initialized } = useAuth()
  const [view, setView] = useState<'chat' | 'history' | 'settings'>('chat')
  const [agentConfig, setAgentConfig] = useState<AgentConfig>(defaultAgentConfig)
  const [isCreatingSession, setIsCreatingSession] = useState(false)
  const [newTaskInput, setNewTaskInput] = useState('')

  const {
    sessions,
    setSessions,
    addSession,
    updateSession,
    removeSession,
    setCurrentSession,
    setMessages,
    addMessage,
    setLoading,
    isLoading,
  } = useAppStore()

  useWebSocket()

  useEffect(() => {
    if (initialized) {
      loadSessions()
    }
  }, [initialized])

  const loadSessions = async () => {
    try {
      const data = await sessionsApi.getAll()
      setSessions(data)
    } catch (error) {
      console.error('Failed to load sessions:', error)
    }
  }

  const handleCreateSession = async () => {
    if (!newTaskInput.trim() || isCreatingSession) return

    setIsCreatingSession(true)
    setLoading(true)

    try {
      const session = await sessionsApi.create(newTaskInput.trim(), agentConfig)
      addSession(session)
      setCurrentSession(session)
      setMessages([])
      setNewTaskInput('')
      setView('chat')

      await sessionsApi.start(session.id)
      updateSession(session.id, { status: 'active', started_at: new Date().toISOString() })
    } catch (error: any) {
      console.error('Failed to create session:', error)
      alert(error.message || 'Failed to create session')
    } finally {
      setIsCreatingSession(false)
      setLoading(false)
    }
  }

  const handleSendMessage = async (content: string) => {
    const currentSession = useAppStore.getState().currentSession
    if (!currentSession) return

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      session_id: currentSession.id,
      user_id: user?.id || '',
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    }
    addMessage(userMessage)

    try {
      const response = await chatApi.sendMessage(currentSession.id, content)
      addMessage(response)
    } catch (error: any) {
      console.error('Failed to send message:', error)
      addMessage({
        id: crypto.randomUUID(),
        session_id: currentSession.id,
        user_id: 'assistant',
        role: 'assistant',
        content: `Error: ${error.message}`,
        created_at: new Date().toISOString(),
      })
    }
  }

  const handleStartSession = async (id: string) => {
    try {
      await sessionsApi.start(id)
      updateSession(id, { status: 'active', started_at: new Date().toISOString() })
    } catch (error: any) {
      console.error('Failed to start session:', error)
      alert(error.message || 'Failed to start session')
    }
  }

  const handlePauseSession = async (id: string) => {
    try {
      await sessionsApi.pause(id)
      updateSession(id, { status: 'paused' })
    } catch (error: any) {
      console.error('Failed to pause session:', error)
      alert(error.message || 'Failed to pause session')
    }
  }

  const handleCancelSession = async (id: string) => {
    try {
      await sessionsApi.cancel(id)
      updateSession(id, { status: 'cancelled', completed_at: new Date().toISOString() })
    } catch (error: any) {
      console.error('Failed to cancel session:', error)
      alert(error.message || 'Failed to cancel session')
    }
  }

  const handleDeleteSession = async (id: string) => {
    if (!confirm('Are you sure you want to delete this session?')) return

    try {
      await sessionsApi.delete(id)
      removeSession(id)
    } catch (error: any) {
      console.error('Failed to delete session:', error)
      alert(error.message || 'Failed to delete session')
    }
  }

  const handleSelectSession = (session: BrowserSession) => {
    setCurrentSession(session)
    setView('chat')
  }

  const handleSignOut = async () => {
    authApi.clearToken()
    window.location.href = '/'
  }

  if (!initialized) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    )
  }

  const renderContent = () => {
    switch (view) {
      case 'chat':
        return (
          <div className="h-[calc(100vh-8rem)]">
            <ChatInterface onSendMessage={handleSendMessage} />
          </div>
        )

      case 'history':
        return (
          <div className="max-w-4xl mx-auto">
            <SessionList
              onStartSession={handleStartSession}
              onPauseSession={handlePauseSession}
              onCancelSession={handleCancelSession}
              onDeleteSession={handleDeleteSession}
              onSelectSession={handleSelectSession}
            />
          </div>
        )

      case 'settings':
        return (
          <div className="max-w-2xl mx-auto">
            <SettingsPanel
              agentConfig={agentConfig}
              onAgentConfigSave={setAgentConfig}
              userEmail={user?.email || ''}
              onSignOut={handleSignOut}
            />
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Sidebar>
      {view === 'chat' && (
        <div className="mb-6">
          <Card className="p-4">
            <div className="flex gap-3">
              <Input
                value={newTaskInput}
                onChange={(e) => setNewTaskInput(e.target.value)}
                placeholder="What would you like to automate?"
                disabled={isCreatingSession}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateSession()}
                className="flex-1"
              />
              <Button
                onClick={handleCreateSession}
                disabled={!newTaskInput.trim() || isCreatingSession}
                isLoading={isCreatingSession}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Task
              </Button>
            </div>
          </Card>
        </div>
      )}

      {renderContent()}
    </Sidebar>
  )
}
