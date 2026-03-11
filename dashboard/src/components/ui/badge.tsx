import { cn } from '@/lib/utils'
import type { HTMLAttributes, ReactNode } from 'react'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error'
  children: ReactNode
}

const variants = {
  default: 'border-white/[0.06] text-[#525252]',
  success: 'border-green-500/25 text-[#22c55e]',
  warning: 'border-amber-500/25 text-[#f59e0b]',
  error: 'border-red-500/25 text-[#ef4444]',
}

export function Badge({ variant = 'default', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[4px] border px-1.5 py-px text-[10px] font-medium tracking-[0.3px]',
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}
