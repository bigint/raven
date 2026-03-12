import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

export function TabsList({ className, children }: { className?: string; children: ReactNode }) {
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
  value: string
  activeValue: string
  onSelect: (value: string) => void
  children: ReactNode
  className?: string
}

export function TabsTrigger({ value, activeValue, onSelect, children, className }: TabsTriggerProps) {
  const isActive = value === activeValue
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={cn(
        'px-3 py-1 text-[11px] font-medium rounded-[5px]',
        isActive ? 'bg-surface-active text-text-primary' : 'text-text-tertiary hover:text-text-secondary',
        className,
      )}
    >
      {children}
    </button>
  )
}

interface TabsContentProps {
  value: string
  activeValue: string
  children: ReactNode
  className?: string
}

export function TabsContent({ value, activeValue, children, className }: TabsContentProps) {
  if (value !== activeValue) return null
  return <div className={cn('mt-3', className)}>{children}</div>
}
