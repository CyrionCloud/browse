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
  User,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui'

interface DashboardLayoutProps {
  children: React.ReactNode
}

const navigation = [
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
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  const handleSignOut = async () => {
    setIsUserMenuOpen(false)
    await authSignOut()
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 h-14 bg-surface border-b border-border z-50">
        <div className="flex items-center justify-between h-full px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-surface-elevated transition-colors"
            >
              {isSidebarOpen ? (
                <X className="h-5 w-5 text-muted-foreground" />
              ) : (
                <Menu className="h-5 w-5 text-muted-foreground" />
              )}
            </button>

            <Link href="/dashboard" className="flex items-center gap-2">
              <Bot className="h-6 w-6 text-accent" />
              <span className="font-bold text-foreground">AutoBrowse</span>
            </Link>

            <Link
              href="/dashboard"
              className="hidden md:flex items-center gap-2 ml-4 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-surface-elevated transition-colors"
            >
              <Zap className="h-4 w-4" />
              <span>New Task</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
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
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-1 hover:bg-surface-elevated transition-colors"
              >
                <div className="w-8 h-8 bg-accent/20 flex items-center justify-center">
                  <User className="h-4 w-4 text-accent" />
                </div>
              </button>

              {isUserMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-56 bg-surface border border-border shadow-xl z-20">
                    <div className="p-3 border-b border-border">
                      <p className="text-sm font-medium text-foreground truncate">
                        {user?.email?.split('@')[0] || 'User'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user?.email || 'guest@example.com'}
                      </p>
                    </div>
                    <div className="p-1">
                      <Link
                        href="/dashboard/settings"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-surface-elevated transition-colors"
                      >
                        <Settings className="h-4 w-4" />
                        <span>Settings</span>
                      </Link>
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-surface-elevated transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <aside
        className={cn(
          'fixed top-14 left-0 z-40 h-[calc(100vh-3.5rem)] w-64 bg-surface border-r border-border transform transition-transform duration-300 ease-in-out',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <nav className="flex flex-col h-full p-3 space-y-1 overflow-y-auto">
          <div className="mb-4">
            <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Navigation
            </h3>
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsSidebarOpen(false)}
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
          </div>
        </nav>
      </aside>

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <main className="pt-14 min-h-screen">
        <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)]">
          <div className="w-full max-w-5xl px-4 lg:px-8 py-12">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}

export default DashboardLayout
