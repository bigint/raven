import { cn } from '@/lib/utils'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  children: ReactNode
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-indigo-500 text-white hover:bg-indigo-400 shadow-sm shadow-indigo-500/20 active:bg-indigo-600',
  secondary:
    'bg-white/[5%] text-zinc-100 hover:bg-white/[10%] border border-white/[8%] hover:border-white/[12%] active:bg-white/[6%]',
  ghost: 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[6%] active:bg-white/[4%]',
  danger: 'bg-red-500/90 text-white hover:bg-red-500 shadow-sm shadow-red-500/20 active:bg-red-600',
  outline:
    'border border-white/[8%] text-zinc-100 hover:bg-white/[5%] hover:border-white/[12%] active:bg-white/[3%]',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-2.5 text-sm',
  icon: 'p-2',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b] disabled:opacity-40 disabled:pointer-events-none cursor-pointer',
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}
