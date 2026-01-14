'use client'

import * as React from 'react'
import * as ToastPrimitive from '@radix-ui/react-toast'
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

const TOAST_DURATION = 5000

type ToastVariant = 'default' | 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  title: string
  description?: string
  variant?: ToastVariant
  action?: React.ReactNode
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([])

  const addToast = React.useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { ...toast, id }])
  }, [])

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      <ToastPrimitive.Provider swipeDirection="right">
        {children}
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onClose={() => removeToast(toast.id)}
          />
        ))}
        <ToastPrimitive.Viewport className="fixed bottom-4 right-4 flex flex-col gap-2 w-[380px] max-w-[calc(100vw-2rem)] z-50" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  )
}

interface ToastItemProps {
  toast: Toast
  onClose: () => void
}

function ToastItem({ toast, onClose }: ToastItemProps) {
  const variantStyles: Record<ToastVariant, string> = {
    default: 'border-border bg-surface',
    success: 'border-emerald-500/30 bg-emerald-500/10',
    error: 'border-error/30 bg-error/10',
    warning: 'border-amber-500/30 bg-amber-500/10',
    info: 'border-accent/30 bg-accent/10',
  }

  const iconStyles: Record<ToastVariant, string> = {
    default: 'text-muted-foreground',
    success: 'text-emerald-400',
    error: 'text-error-muted',
    warning: 'text-amber-400',
    info: 'text-accent',
  }

  const icons: Record<ToastVariant, React.ReactNode> = {
    default: <Info className="h-5 w-5" />,
    success: <CheckCircle2 className="h-5 w-5" />,
    error: <AlertCircle className="h-5 w-5" />,
    warning: <AlertCircle className="h-5 w-5" />,
    info: <Info className="h-5 w-5" />,
  }

  return (
    <ToastPrimitive.Root
      duration={TOAST_DURATION}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border shadow-lg animate-slide-up',
        variantStyles[toast.variant || 'default']
      )}
    >
      <div className={cn('shrink-0 mt-0.5', iconStyles[toast.variant || 'default'])}>
        {icons[toast.variant || 'default']}
      </div>
      <div className="flex-1 min-w-0">
        <ToastPrimitive.Title className="font-medium text-foreground text-sm">
          {toast.title}
        </ToastPrimitive.Title>
        {toast.description && (
          <ToastPrimitive.Description className="text-sm text-muted-foreground mt-1">
            {toast.description}
          </ToastPrimitive.Description>
        )}
      </div>
      <ToastPrimitive.Close className="shrink-0">
        <X className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  )
}

export function toast(props: Omit<Toast, 'id'>) {
  const context = React.useContext(ToastContext)
  if (context) {
    context.addToast(props)
  }
}

toast.success = (title: string, description?: string) => {
  toast({ title, description, variant: 'success' })
}

toast.error = (title: string, description?: string) => {
  toast({ title, description, variant: 'error' })
}

toast.warning = (title: string, description?: string) => {
  toast({ title, description, variant: 'warning' })
}

toast.info = (title: string, description?: string) => {
  toast({ title, description, variant: 'info' })
}
