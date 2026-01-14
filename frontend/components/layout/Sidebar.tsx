'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import {
  Bot,
  MessageSquare,
  History,
  Settings,
  LogOut,
  Menu,
  X,
  Zap,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui'

interface SidebarProps {
  children: React.ReactNode
}

export function Sidebar({ children }: SidebarProps) {
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const { wsConnected } = useAppStore()
  const [mobileOpen, setMobileOpen] = useState(false)

  const navigation = [
    { name: 'New Task', href: '/dashboard', icon: Zap },
    { name: 'History', href: '/dashboard/history', icon: History },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ]

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/'
  }

  return (
    <div className="flex h-screen bg-dark-bg">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-dark-surface border-r border-dark-border transform transition-transform duration-200 lg:relative lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-dark-border">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Bot className="h-8 w-8 text-primary-500" />
              <span className="font-bold text-xl text-foreground">AutoBrowse</span>
            </Link>
            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden p-1 rounded-md hover:bg-dark-elevated"
            >
              <X className="h-5 w-5 text-text-muted" />
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary-500/20 text-primary-400'
                      : 'text-text-secondary hover:text-foreground hover:bg-dark-elevated'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          <div className="p-4 border-t border-dark-border">
            <div className="flex items-center gap-3 mb-3 px-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user?.email || 'Guest'}
                </p>
                <div className="flex items-center gap-1">
                  <div
                    className={cn(
                      'w-2 h-2 rounded-full',
                      wsConnected ? 'bg-success-500' : 'bg-text-muted'
                    )}
                  />
                  <span className="text-xs text-text-muted">
                    {wsConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={handleSignOut}
              className="w-full justify-start text-text-secondary hover:text-foreground"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="lg:hidden flex items-center justify-between p-4 border-b border-dark-border bg-dark-surface">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-md hover:bg-dark-elevated"
          >
            <Menu className="h-5 w-5 text-text-muted" />
          </button>
          <Link href="/dashboard" className="flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary-500" />
            <span className="font-bold text-lg text-foreground">AutoBrowse</span>
          </Link>
          <div className="w-10" />
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>

      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </div>
  )
}
