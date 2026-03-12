import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

export const TabsList = ({ className, children }: { readonly className?: string; readonly children: ReactNode }) => {
  return (
    <div
      className={cn(
        'inline-flex rounded-md border border-border bg-surface p-0.5',
        className,
      )}
    >
      {children}
    </div>
  )
}

interface TabsTriggerProps {
  readonly value: string
  readonly activeValue: string
  readonly onSelect: (value: string) => void
  readonly children: ReactNode
  readonly className?: string
}

export const TabsTrigger = ({ value, activeValue, onSelect, children, className }: TabsTriggerProps) => {
  const isActive = value === activeValue
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={cn(
        'px-3 py-1 text-[11px] font-medium rounded-[5px] transition-colors duration-150',
        isActive ? 'bg-surface-active text-text-primary' : 'text-text-tertiary hover:text-text-secondary',
        className,
      )}
    >
      {children}
    </button>
  )
}

interface TabsContentProps {
  readonly value: string
  readonly activeValue: string
  readonly children: ReactNode
  readonly className?: string
}

export const TabsContent = ({ value, activeValue, children, className }: TabsContentProps) => {
  if (value !== activeValue) return null
  return (
    <div
      key={value}
      className={cn('mt-3', className)}
      style={{ animation: 'fade-in 150ms ease-out' }}
    >
      {children}
    </div>
  )
}
