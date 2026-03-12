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
    <div className={cn('flex flex-col items-center justify-center py-8', className)}>
      <div className="text-text-muted">
        {icon ?? <Inbox className="h-5 w-5" />}
      </div>
      <p className="mt-2 text-[13px] font-semibold text-text-secondary">{title}</p>
      {description && (
        <p className="mt-1 text-xs text-text-tertiary max-w-[240px] text-center">{description}</p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}
