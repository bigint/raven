import { cn } from '@/lib/utils'
import type { HTMLAttributes, ReactNode } from 'react'

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'outline'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  children: ReactNode
  dot?: boolean
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-transparent text-[#a3a3a3] border border-white/[0.08]',
  success: 'bg-transparent text-[#a3a3a3] border border-white/[0.08]',
  warning: 'bg-transparent text-[#a3a3a3] border border-white/[0.08]',
  error: 'bg-transparent text-[#a3a3a3] border border-white/[0.08]',
  outline: 'bg-transparent text-[#a3a3a3] border border-white/[0.08]',
}

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-[#525252]',
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  error: 'bg-red-400',
  outline: 'bg-[#525252]',
}

export function Badge({ variant = 'default', dot, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium',
        variantStyles[variant],
        className,
      )}
      {...props}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dotColors[variant])} />}
      {children}
    </span>
  )
}
