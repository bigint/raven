import { cn } from '@/lib/utils'
import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  readonly children: ReactNode
}

export const Card = ({ className, children, ...props }: CardProps) => {
  return (
    <div
      className={cn('rounded-lg border border-border bg-surface p-4', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export const CardHeader = ({ className, children, ...props }: CardProps) => {
  return (
    <div className={cn('mb-3 flex items-center justify-between', className)} {...props}>
      {children}
    </div>
  )
}

export const CardTitle = ({ className, children, ...props }: CardProps) => {
  return (
    <h3
      className={cn('text-[9px] font-medium text-text-muted uppercase tracking-[1px]', className)}
      {...props}
    >
      {children}
    </h3>
  )
}

export const CardContent = ({ className, children, ...props }: CardProps) => {
  return (
    <div className={cn('', className)} {...props}>
      {children}
    </div>
  )
}
