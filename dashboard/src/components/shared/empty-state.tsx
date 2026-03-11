import { cn } from '@/lib/utils'
import { Inbox } from 'lucide-react'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
  className?: string
}

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      <div className="rounded-xl bg-white/5 p-4 mb-4">
        {icon || <Inbox className="h-8 w-8 text-text-dark-secondary" />}
      </div>
      <h3 className="text-sm font-medium text-text-dark">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-text-dark-secondary max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
