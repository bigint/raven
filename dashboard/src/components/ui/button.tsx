import { cn } from '@/lib/utils'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'icon'
  children: ReactNode
}

const variants = {
  primary: 'bg-[#fafafa] text-[#09090b] hover:bg-[#e5e5e5]',
  secondary: 'bg-transparent text-[#a3a3a3] border border-white/[0.06] hover:bg-white/[0.05]',
  ghost: 'bg-transparent text-[#a3a3a3] hover:bg-white/[0.05]',
  danger: 'bg-transparent text-[#ef4444] border border-red-500/20 hover:bg-red-500/[0.08]',
}

const sizes = {
  sm: 'h-6 px-2 text-[10px]',
  md: 'h-7 px-2.5 text-xs',
  icon: 'h-7 w-7 p-0 justify-center',
}

export function Button({ variant = 'secondary', size = 'md', className, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md font-medium',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 focus-visible:ring-offset-1 focus-visible:ring-offset-[#09090b]',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
