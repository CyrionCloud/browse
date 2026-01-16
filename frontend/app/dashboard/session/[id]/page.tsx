'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { SessionViewer } from '@/components/session/SessionViewer'
import { sessionsApi } from '@/lib/api'
import { useAppStore } from '@/store/useAppStore'
import { PageLoader } from '@/components/LoadingState'
import { Card } from '@/components/ui'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import type { BrowserSession } from '@autobrowse/shared'

export default function SessionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { wsConnected, addWsEvent } = useAppStore()
  const [session, setSession] = useState<BrowserSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const sessionId = params.id as string

  useEffect(() => {
    loadSession()
  }, [sessionId])

  const loadSession = async () => {
    try {
      setIsLoading(true)
      setError(null)
      console.log('Loading session:', sessionId)
      const data = await sessionsApi.getById(sessionId)
      console.log('Session loaded:', data)
      console.log('Session status:', data?.status)
      setSession(data)
    } catch (err: any) {
      console.error('Failed to load session:', err)
      setError(err.message || 'Failed to load session')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <PageLoader message="Loading session..." />
  }

  if (error || !session) {
    return (
      <div className="h-full flex items-center justify-center">
        <Card className="p-8 max-w-md text-center">
          <AlertCircle className="h-12 w-12 text-error-muted mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Error Loading Session</h2>
          <p className="text-sm text-muted-foreground mb-4">{error || 'Session not found'}</p>
          <button
            onClick={() => router.push('/dashboard/history')}
            className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/80 transition-colors"
          >
            Back to History
          </button>
        </Card>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={() => router.push('/dashboard/history')}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to History
        </button>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div
            className={`w-2 h-2 rounded-full ${
              wsConnected ? 'bg-emerald-400' : 'bg-muted-foreground'
            }`}
          />
          {wsConnected ? 'Live' : 'Disconnected'}
        </div>
      </div>

      <SessionViewer session={session} onSessionUpdate={setSession} />
    </div>
  )
}
