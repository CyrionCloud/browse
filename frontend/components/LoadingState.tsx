'use client'

import { Spinner, PulseLoader } from '@/components/ui'
import { cn } from '@/lib/utils'

interface LoadingOverlayProps {
  isLoading: boolean
  message?: string
  className?: string
}

export function LoadingOverlay({ isLoading, message, className }: LoadingOverlayProps) {
  if (!isLoading) return null

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm',
        className
      )}
    >
      <div className="flex flex-col items-center gap-4">
        <Spinner size="lg" />
        {message && (
          <p className="text-sm text-muted-foreground animate-pulse">{message}</p>
        )}
      </div>
    </div>
  )
}

interface LoadingCardProps {
  message?: string
  className?: string
}

export function LoadingCard({ message, className }: LoadingCardProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 rounded-xl border border-border bg-surface',
        className
      )}
    >
      <Spinner size="lg" className="mb-4" />
      {message && (
        <p className="text-sm text-muted-foreground">{message}</p>
      )}
    </div>
  )
}

interface LoadingSkeletonProps {
  className?: string
}

export function LoadingSkeleton({ className }: LoadingSkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-surface-elevated',
        className
      )}
    />
  )
}

interface ChatLoadingProps {
  className?: string
}

export function ChatLoading({ className }: ChatLoadingProps) {
  return (
    <div className={cn('flex items-center gap-3 p-4', className)}>
      <div className="h-8 w-8 rounded-full bg-surface-elevated animate-pulse" />
      <div className="flex-1 space-y-2">
        <LoadingSkeleton className="h-4 w-1/3" />
        <LoadingSkeleton className="h-16 w-full" />
      </div>
    </div>
  )
}

interface PageLoaderProps {
  message?: string
}

export function PageLoader({ message }: PageLoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <PulseLoader />
      {message && (
        <p className="text-sm text-muted-foreground">{message}</p>
      )}
    </div>
  )
}
