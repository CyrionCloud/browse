import * as React from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'accent' | 'success' | 'warning' | 'error' | 'outline'
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants = {
      default: 'bg-surface-elevated text-foreground border border-border',
      accent: 'bg-accent/15 text-accent-muted border border-accent/25',
      success: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25',
      warning: 'bg-amber-500/15 text-amber-400 border border-amber-500/25',
      error: 'bg-error/15 text-error-muted border border-error/25',
      outline: 'bg-transparent text-foreground border border-border',
    }

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
          variants[variant],
          className
        )}
        {...props}
      />
    )
  }
)
Badge.displayName = 'Badge'

export { Badge }
