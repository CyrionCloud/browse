'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { TaskInputPanel } from './TaskInputPanel'
import { useAuth } from '@/hooks/useAuth'
import { useAppStore } from '@/store/useAppStore'
import { sessionsApi } from '@/lib/api'
import { PageLoader } from '@/components/LoadingState'

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
  const router = useRouter()
  const { user, initialized } = useAuth()
  const {
    addSession,
    setCurrentSession,
    setMessages,
    setLoading,
    isLoading,
    agentConfig,
  } = useAppStore()
  const [taskInput, setTaskInput] = useState('')
  const [selectedMode, setSelectedMode] = useState<ExecutionMode>(executionModes[0])

  // Guard against double submissions (React StrictMode, fast double-clicks)
  const isSubmittingRef = useRef(false)

  const handleCreateSession = async () => {
    // Prevent double submission
    if (!taskInput.trim() || isLoading || isSubmittingRef.current) return

    isSubmittingRef.current = true
    setLoading(true)

    try {
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
      // Reset after a delay to prevent rapid re-submissions
      setTimeout(() => {
        isSubmittingRef.current = false
      }, 1000)
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
