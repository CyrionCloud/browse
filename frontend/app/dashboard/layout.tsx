'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import {
  Bot,
  History,
  Settings,
  LogOut,
  Plus,
  BookOpen,
  ShoppingBag,
  BarChart3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  User,
  Key,
} from 'lucide-react'

interface DashboardLayoutProps {
  children: React.ReactNode
}

const navigation = [
  { name: 'History', href: '/dashboard/history', icon: History },
  { name: 'Skills', href: '/dashboard/skills', icon: BookOpen },
  { name: 'Marketplace', href: '/dashboard/marketplace', icon: ShoppingBag },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
]

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAppStore()
  const { signOut: authSignOut } = useAuth()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  const handleSignOut = async () => {
    setIsUserMenuOpen(false)
    await authSignOut()
    window.location.href = '/'
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          'flex flex-col h-full bg-surface border-r border-border transition-all duration-300',
          isCollapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Logo Section */}
        <div className={cn(
          "flex items-center p-4 border-b border-border",
          isCollapsed ? "justify-center" : "justify-between"
        )}>
          {!isCollapsed && (
            <Link href="/dashboard" className="flex items-center gap-2">
              <Bot className="h-7 w-7 text-accent shrink-0" />
              <span className="font-bold text-lg text-accent">AutoBrowse</span>
            </Link>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-surface-elevated transition-colors"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Plan Badge */}
        {!isCollapsed && (
          <div className="mx-3 mt-3 p-3 bg-accent/10 border border-accent/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-accent" />
                <span className="text-sm font-semibold text-accent">FREE PLAN</span>
              </div>
              <Key className="h-4 w-4 text-accent" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">245 Credits</p>
          </div>
        )}

        {/* New Task Button */}
        <div className="p-3">
          <Link
            href="/dashboard"
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 bg-accent text-white font-medium transition-colors hover:bg-accent-hover',
              pathname === '/dashboard' && 'ring-2 ring-accent-light',
              isCollapsed && 'justify-center px-2'
            )}
          >
            <Plus className="h-5 w-5 shrink-0" />
            {!isCollapsed && <span>New Task</span>}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-accent/15 text-accent'
                    : 'text-muted-foreground hover:text-foreground hover:bg-surface-elevated',
                  isCollapsed && 'justify-center px-2'
                )}
                title={isCollapsed ? item.name : undefined}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!isCollapsed && <span>{item.name}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Bottom Section */}
        <div className="mt-auto border-t border-border">
          {/* User Section */}
          <div className="p-3">
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-surface-elevated transition-colors',
                  isCollapsed && 'justify-center px-2'
                )}
              >
                <div className="w-8 h-8 bg-accent/20 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-accent">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                {!isCollapsed && (
                  <>
                    <span className="flex-1 text-left truncate">
                      {user?.email?.split('@')[0] || 'User'}
                    </span>
                    <ChevronDown className={cn('h-4 w-4 transition-transform', isUserMenuOpen && 'rotate-180')} />
                  </>
                )}
              </button>

              {isUserMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsUserMenuOpen(false)}
                  />
                  <div className={cn(
                    'absolute bottom-full left-0 mb-2 bg-surface border border-border shadow-xl z-20',
                    isCollapsed ? 'w-48 left-full ml-2 bottom-0' : 'w-full'
                  )}>
                    <div className="p-2 border-b border-border">
                      <p className="text-sm font-medium text-foreground truncate px-2">
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
                        <span>Log out</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Settings Link */}
          <div className="px-3 pb-3">
            <Link
              href="/dashboard/settings"
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors',
                pathname === '/dashboard/settings'
                  ? 'bg-accent/15 text-accent'
                  : 'text-muted-foreground hover:text-foreground hover:bg-surface-elevated',
                isCollapsed && 'justify-center px-2'
              )}
              title={isCollapsed ? 'Settings' : undefined}
            >
              <Settings className="h-5 w-5 shrink-0" />
              {!isCollapsed && <span>Settings</span>}
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="h-full px-4 py-6">
          {children}
        </div>
      </main>
    </div>
  )
}

export default DashboardLayout
