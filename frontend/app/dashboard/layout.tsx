'use client'

import { useState } from 'react'
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
  Zap,
  BookOpen,
  ShoppingBag,
  BarChart3,
  ChevronDown,
  FileText,
  CreditCard,
} from 'lucide-react'
import { Button } from '@/components/ui'

interface DashboardLayoutProps {
  children: React.ReactNode
}

const navigation = [
  { name: 'New Task', href: '/dashboard', icon: Zap },
  { name: 'History', href: '/dashboard/history', icon: History },
  { name: 'Skills', href: '/dashboard/skills', icon: BookOpen },
  { name: 'Marketplace', href: '/dashboard/marketplace', icon: ShoppingBag },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname()
  const { user } = useAppStore()
  const { signOut: authSignOut } = useAuth()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isProjectOpen, setIsProjectOpen] = useState(false)

  const handleSignOut = async () => {
    await authSignOut()
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 h-14 bg-surface border-b border-border z-50">
        <div className="flex items-center justify-between h-full px-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Bot className="h-7 w-7 text-accent" />
              <span className="font-bold text-lg text-foreground">AutoBrowse</span>
            </Link>

            <div className="hidden md:flex items-center gap-1 ml-8">
              <button
                onClick={() => setIsProjectOpen(!isProjectOpen)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-surface-elevated transition-colors"
              >
                <span>Default Project</span>
                <ChevronDown className="h-3 w-3" />
              </button>

              <Link
                href="/dashboard"
                className="flex items-center gap-2 ml-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-surface-elevated transition-colors"
              >
                <Zap className="h-4 w-4" />
                <span>New Session</span>
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/docs"
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-surface-elevated transition-colors"
            >
              <BookOpen className="h-4 w-4" />
              <span>Docs</span>
            </Link>

            <Link
              href="/changelog"
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-surface-elevated transition-colors"
            >
              <FileText className="h-4 w-4" />
              <span>Changelog</span>
            </Link>

            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-surface-elevated border border-border">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">245</span>
              <span className="text-xs text-muted-foreground">credits</span>
            </div>

            <Button variant="default" size="sm" className="hidden md:flex">
              Get API Key
            </Button>

            <div className="relative">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 hover:bg-surface-elevated transition-colors"
              >
                <Menu className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <aside
        className={cn(
          'fixed top-14 left-0 z-40 h-[calc(100vh-3.5rem)] w-64 bg-surface border-r border-border transform transition-transform duration-300 ease-in-out',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-accent/20 flex items-center justify-center">
                <span className="text-sm font-medium text-accent">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user?.email?.split('@')[0] || 'User'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email || 'guest@example.com'}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={handleSignOut}
              className="w-full justify-start text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>

          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-accent/15 text-accent'
                      : 'text-muted-foreground hover:text-foreground hover:bg-surface-elevated'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      </aside>

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <main className="pt-14 lg:pl-64 min-h-screen">
        <div className="max-w-4xl mx-auto px-4 lg:px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}

export default DashboardLayout
