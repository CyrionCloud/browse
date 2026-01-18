'use client'

import { useState } from 'react'
import { TaskInputPanel } from './TaskInputPanel'
import { useAuth } from '@/hooks/useAuth'
import { useAppStore } from '@/store/useAppStore'
import { sessionsApi } from '@/lib/api'
import { PageLoader } from '@/components/LoadingState'
import { useRouter } from 'next/navigation'

interface ExecutionMode {
  id: string
  name: string
  description: string
}

const executionModes: ExecutionMode[] = [
  { id: 'autobrowse', name: 'Auto Browse LLM', description: 'Full browser automation' },
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
    agentConfig,  // Use config from store
  } = useAppStore()
  const [taskInput, setTaskInput] = useState('')
  const [selectedMode, setSelectedMode] = useState<ExecutionMode>(executionModes[0])

  const handleCreateSession = async () => {
    if (!taskInput.trim() || isLoading) return

    setLoading(true)

    try {
      // Use agentConfig from store (set via Settings page)
      const session = await sessionsApi.create(taskInput.trim(), {
        ...agentConfig,
        enabledSkills: [selectedMode.id],
      })
      console.log('Creating session with config:', { maxSteps: agentConfig.maxSteps, model: agentConfig.model })
      addSession(session)
      setCurrentSession(session)
      setMessages([])

      await sessionsApi.start(session.id)

      setTaskInput('')
      router.push(`/dashboard/session/${session.id}`)
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
