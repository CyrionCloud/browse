'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from '@/components/ui'
import { PageLoader } from '@/components/LoadingState'
import { useAppStore } from '@/store/useAppStore'
import { cn, formatDate } from '@/lib/utils'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  Zap,
  CheckCircle2,
  XCircle,
  Calendar,
  Download,
  Filter,
} from 'lucide-react'

export default function AnalyticsPage() {
  const { sessions } = useAppStore()
  const [timeRange, setTimeRange] = useState('7d')

  const stats = {
    totalSessions: sessions.length,
    completedSessions: sessions.filter(s => s.status === 'completed').length,
    failedSessions: sessions.filter(s => s.status === 'failed').length,
    avgDuration: sessions.length > 0
      ? Math.round(sessions.reduce((acc, s) => acc + (s.duration_seconds || 0), 0) / sessions.length)
      : 0,
  }

  const sessionByDay = [
    { day: 'Mon', sessions: 4 },
    { day: 'Tue', sessions: 7 },
    { day: 'Wed', sessions: 3 },
    { day: 'Thu', sessions: 8 },
    { day: 'Fri', sessions: 5 },
    { day: 'Sat', sessions: 2 },
    { day: 'Sun', sessions: 6 },
  ]

  const maxSessions = Math.max(...sessionByDay.map(d => d.sessions))

  const recentActivity = sessions.slice(0, 5).map(session => ({
    id: session.id,
    action: session.status === 'completed' ? 'Session completed' : 
            session.status === 'failed' ? 'Session failed' :
            session.status === 'active' ? 'Session started' : 'Session created',
    time: formatDate(session.created_at),
    status: session.status,
  }))

  return (
    <Sidebar>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Analytics</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track your automation usage and performance
            </p>
          </div>
          <div className="flex gap-2">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="h-10 rounded-lg border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Sessions</p>
                  <p className="text-2xl font-semibold text-foreground mt-1">
                    {stats.totalSessions}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Zap className="h-6 w-6 text-accent" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-3 text-xs text-emerald-400">
                <TrendingUp className="h-3 w-3" />
                <span>+12% from last week</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-semibold text-foreground mt-1">
                    {stats.completedSessions}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
                <span>{Math.round((stats.completedSessions / Math.max(stats.totalSessions, 1)) * 100)}% success rate</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Duration</p>
                  <p className="text-2xl font-semibold text-foreground mt-1">
                    {Math.floor(stats.avgDuration / 60)}m {stats.avgDuration % 60}s
                  </p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-amber-400" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
                <span>Per session</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Failed</p>
                  <p className="text-2xl font-semibold text-foreground mt-1">
                    {stats.failedSessions}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-error/10 flex items-center justify-center">
                  <XCircle className="h-6 w-6 text-error-muted" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-3 text-xs text-error-muted">
                <TrendingDown className="h-3 w-3" />
                <span>-5% from last week</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-accent" />
                Sessions This Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sessionByDay.map(({ day, sessions }) => (
                  <div key={day} className="flex items-center gap-3">
                    <span className="w-8 text-sm text-muted-foreground">{day}</span>
                    <div className="flex-1 h-8 bg-surface-elevated rounded-lg overflow-hidden">
                      <div
                        className="h-full bg-accent/80 rounded-lg transition-all duration-500"
                        style={{ width: `${(sessions / maxSessions) * 100}%` }}
                      />
                    </div>
                    <span className="w-8 text-sm text-foreground text-right">{sessions}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-accent" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.length > 0 ? (
                  recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div
                        className={cn(
                          'h-8 w-8 rounded-full flex items-center justify-center shrink-0',
                          activity.status === 'completed' && 'bg-emerald-500/10',
                          activity.status === 'failed' && 'bg-error/10',
                          activity.status === 'active' && 'bg-accent/10',
                          activity.status === 'pending' && 'bg-amber-500/10'
                        )}
                      >
                        {activity.status === 'completed' && (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        )}
                        {activity.status === 'failed' && (
                          <XCircle className="h-4 w-4 text-error-muted" />
                        )}
                        {activity.status === 'active' && (
                          <Zap className="h-4 w-4 text-accent" />
                        )}
                        {activity.status === 'pending' && (
                          <Clock className="h-4 w-4 text-amber-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">{activity.action}</p>
                        <p className="text-xs text-muted-foreground">{activity.time}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No recent activity
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-accent" />
              Usage This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 31 }, (_, i) => {
                const day = i + 1
                const hasActivity = sessions.some((_, index) => index % 4 === i % 4)
                return (
                  <div
                    key={day}
                    className={cn(
                      'aspect-square rounded-lg flex items-center justify-center text-xs',
                      hasActivity
                        ? 'bg-accent/20 text-accent'
                        : 'bg-surface-elevated text-muted-foreground'
                    )}
                    title={`Day ${day}`}
                  >
                    {day}
                  </div>
                )
              })}
            </div>
            <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-accent/20" />
                <span>Active days</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-surface-elevated" />
                <span>No activity</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Sidebar>
  )
}
