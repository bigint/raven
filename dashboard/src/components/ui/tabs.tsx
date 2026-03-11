import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface TabsProps {
  value: string
  onValueChange: (value: string) => void
  children: ReactNode
  className?: string
}

export function Tabs({ children, className }: TabsProps) {
  return <div className={cn('', className)}>{children}</div>
}

interface TabsListProps {
  children: ReactNode
  className?: string
}

export function TabsList({ children, className }: TabsListProps) {
  return (
    <div
      className={cn('inline-flex items-center gap-1 rounded-lg bg-neutral-800 p-1', className)}
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

export function TabsTrigger({
  value,
  activeValue,
  onSelect,
  children,
  className,
}: TabsTriggerProps) {
  const isActive = value === activeValue
  return (
    <button
      type="button"
      className={cn(
        'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
        isActive
          ? 'bg-primary text-white shadow-sm'
          : 'text-neutral-400 hover:text-neutral-100',
        className,
      )}
      onClick={() => onSelect(value)}
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
  return <div className={cn('mt-4', className)}>{children}</div>
}
