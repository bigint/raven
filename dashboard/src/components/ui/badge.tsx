import { cn } from '@/lib/utils'
import type { HTMLAttributes, ReactNode } from 'react'

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  children: ReactNode
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-white/10 text-text-dark-secondary',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  error: 'bg-error/15 text-error',
  info: 'bg-primary/15 text-primary-light',
}

export function Badge({ variant = 'default', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium',
        variantStyles[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}
