import { cn } from '@/lib/utils'
import type { HTMLAttributes } from 'react'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  readonly variant?: 'default' | 'outline'
}

export const Badge = ({ variant = 'default', className, children, ...props }: BadgeProps) => {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium',
        variant === 'default' && 'bg-[#4338CA]/20 text-[#818CF8] border border-[#4338CA]/30',
        variant === 'outline' && 'border border-white/20 text-white/70',
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}
