'use client'

import { useState } from 'react'
import { TaskInputPanel } from './TaskInputPanel'
import { useAuth } from '@/hooks/useAuth'
import { useAppStore } from '@/store/useAppStore'
import { sessionsApi } from '@/lib/api'
import { PageLoader } from '@/components/LoadingState'
import type { AgentConfig } from '@autobrowse/shared'
import { useRouter } from 'next/navigation'

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

interface ExecutionMode {
  id: string
  name: string
  description: string
}

const executionModes: ExecutionMode[] = [
  { id: 'browser-use', name: 'Browser Use LLM', description: 'Full browser automation' },
  { id: 'research', name: 'Research Agent', description: 'Deep web research' },
  { id: 'extraction', name: 'Extraction Agent', description: 'Data extraction focus' },
  { id: 'monitoring', name: 'Monitoring Agent', description: 'Continuous monitoring' },
]

export default function DashboardPage() {
  const { user, initialized } = useAuth()
  const router = useRouter()
  const {
    setCurrentSession,
    addSession,
    setMessages,
    setLoading,
    isLoading,
  } = useAppStore()
  const [taskInput, setTaskInput] = useState('')
  const [selectedMode, setSelectedMode] = useState<ExecutionMode>(executionModes[0])

  const handleCreateSession = async () => {
    if (!taskInput.trim() || isLoading) return

    setLoading(true)

    try {
      const session = await sessionsApi.create(taskInput.trim(), {
        ...defaultAgentConfig,
        enabledSkills: [selectedMode.id],
      })
      addSession(session)
      setCurrentSession(session)
      setMessages([])

      await sessionsApi.start(session.id)

      setTaskInput('')
      router.push('/dashboard/history')
    } catch (error: any) {
      console.error('Failed to create session:', error)
      alert(error.message || 'Failed to create session')
    } finally {
      setLoading(false)
    }
  }

  if (!initialized) {
    return <PageLoader message="Loading..." />
  }

  return (
    <TaskInputPanel
      value={taskInput}
      onChange={setTaskInput}
      onSubmit={handleCreateSession}
      selectedMode={selectedMode}
      onModeChange={setSelectedMode}
    />
  )
}
