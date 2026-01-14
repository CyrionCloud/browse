import * as React from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'alert' | 'outline'
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants = {
      default: 'bg-dark-elevated text-foreground border border-dark-border',
      primary: 'bg-primary-500/20 text-primary-400 border border-primary-500/30',
      success: 'bg-success-500/20 text-success-500 border border-success-500/30',
      warning: 'bg-warning-500/20 text-warning-500 border border-warning-500/30',
      alert: 'bg-alert-500/20 text-alert-500 border border-alert-500/30',
      outline: 'bg-transparent text-foreground border border-dark-border',
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
