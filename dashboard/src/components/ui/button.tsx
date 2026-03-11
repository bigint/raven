import { cn } from '@/lib/utils'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  children: ReactNode
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-[#fafafa] text-[#0a0a0a] hover:bg-[#e5e5e5] active:bg-[#d4d4d4]',
  secondary: 'bg-transparent text-[#a3a3a3] border border-white/[0.08] hover:bg-white/[0.04]',
  ghost: 'text-[#a3a3a3] hover:text-[#fafafa] hover:bg-white/[0.04]',
  danger: 'bg-transparent text-[#ef4444] border border-[rgba(239,68,68,0.1)] hover:bg-[rgba(239,68,68,0.06)]',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-[14px] py-[7px] text-[13px]',
  lg: 'px-5 py-2.5 text-[13px]',
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
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/15 disabled:opacity-40 disabled:pointer-events-none cursor-pointer',
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
