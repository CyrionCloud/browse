import * as React from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'accent' | 'success' | 'warning' | 'error' | 'outline'
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants = {
      default: 'bg-surface-elevated text-foreground border border',
      accent: 'bg-accent/15 text-accent border-accent/25',
      success: 'bg-success/15 text-success border-success/25',
      warning: 'bg-warning/15 text-warning border-warning/25',
      error: 'bg-error/15 text-error-muted border-error/25',
      outline: 'bg-transparent text-foreground border border',
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
