import { cn } from '@/lib/utils'
import type { ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  href?: string
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-[#4338CA] text-white hover:bg-[#3730A3] shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30',
  secondary:
    'bg-white/10 text-white border border-white/20 hover:bg-white/15 hover:border-white/30',
  ghost: 'text-white/70 hover:text-white hover:bg-white/5',
}

export function Button({ variant = 'primary', className, href, children, ...props }: ButtonProps) {
  const styles = cn(
    'inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-medium transition-all duration-200 cursor-pointer',
    variantStyles[variant],
    className,
  )

  if (href) {
    return (
      <a href={href} className={styles}>
        {children}
      </a>
    )
  }

  return (
    <button className={styles} {...props}>
      {children}
    </button>
  )
}
