import { cn } from '@/lib/utils'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'icon'
  children: ReactNode
}

const variants = {
  primary: 'bg-accent text-accent-text hover:bg-accent-hover',
  secondary: 'bg-transparent text-text-secondary border border-border hover:bg-surface-hover',
  ghost: 'bg-transparent text-text-secondary hover:bg-surface-hover',
  danger: 'bg-transparent text-error border border-red-500/20 hover:bg-red-500/[0.08]',
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
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus focus-visible:ring-offset-1 focus-visible:ring-offset-bg',
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
