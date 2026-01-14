'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import {
  Bot,
  History,
  Settings,
  LogOut,
  Menu,
  X,
  Zap,
  BookOpen,
  BarChart3,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui'

interface SidebarProps {
  children: React.ReactNode
}

export function Sidebar({ children }: SidebarProps) {
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const { wsConnected } = useAppStore()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const navigation = [
    { name: 'New Task', href: '/dashboard', icon: Zap },
    { name: 'History', href: '/dashboard/history', icon: History },
    { name: 'Skills', href: '/dashboard/skills', icon: BookOpen },
    { name: 'Marketplace', href: '/dashboard/marketplace', icon: ShoppingBag },
    { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ]

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/'
  }

  const SidebarContent = () => (
    <>
      <div className="flex items-center justify-between p-4 border-b border-border">
        {!isCollapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <Bot className="h-8 w-8 text-accent" />
            <span className="font-bold text-lg text-foreground">AutoBrowse</span>
          </Link>
        )}
        {isCollapsed && (
          <Link href="/dashboard" className="flex justify-center w-full">
            <Bot className="h-8 w-8 text-accent" />
          </Link>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex items-center justify-center p-1.5 rounded-md hover:bg-surface-hover text-muted-foreground hover:text-foreground transition-colors"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      <nav className={cn('flex-1 p-3 space-y-1', isCollapsed && 'px-2')}>
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-accent/15 text-accent'
                  : 'text-muted-foreground hover:text-foreground hover:bg-surface-elevated',
                isCollapsed && 'justify-center'
              )}
              title={isCollapsed ? item.name : undefined}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!isCollapsed && <span>{item.name}</span>}
            </Link>
          )
        })}
      </nav>

      <div className={cn('p-4 border-t border-border', isCollapsed && 'px-2')}>
        <div className={cn('flex items-center gap-3 mb-3', isCollapsed && 'justify-center')}>
          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
            <span className="text-xs font-medium text-accent">
              {user?.email?.charAt(0).toUpperCase() || 'G'}
            </span>
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {user?.email?.split('@')[0] || 'Guest'}
              </p>
              <div className="flex items-center gap-1">
                <div
                  className={cn(
                    'w-1.5 h-1.5 rounded-full',
                    wsConnected ? 'bg-emerald-400' : 'bg-muted-foreground'
                  )}
                />
                <span className="text-xs text-muted-foreground">
                  {wsConnected ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          )}
        </div>
        {!isCollapsed ? (
          <Button
            variant="ghost"
            onClick={handleSignOut}
            className="w-full justify-start text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        ) : (
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-elevated transition-colors"
          >
            <LogOut className="h-5 w-5" />
          </button>
        )}
      </div>
    </>
  )

  return (
    <div className="flex h-screen bg-background">
      <aside
        className={cn(
          'fixed lg:relative z-50 h-full bg-surface border-r border-border transition-all duration-300 ease-in-out',
          isCollapsed ? 'w-16' : 'w-64',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex flex-col h-full">
          <SidebarContent />
        </div>
      </aside>

      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="lg:hidden flex items-center justify-between p-4 border-b border-border bg-surface">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-2 rounded-md hover:bg-surface-hover"
          >
            <Menu className="h-5 w-5 text-muted-foreground" />
          </button>
          <Link href="/dashboard" className="flex items-center gap-2">
            <Bot className="h-6 w-6 text-accent" />
            <span className="font-bold text-lg text-foreground">AutoBrowse</span>
          </Link>
          <div className="w-10" />
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
