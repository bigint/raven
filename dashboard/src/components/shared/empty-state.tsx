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
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
      <div className="p-4 mb-4">
        {icon || <Inbox className="h-7 w-7 text-[#525252]" />}
      </div>
      <h3 className="text-sm font-medium text-[#a3a3a3]">{title}</h3>
      {description && (
        <p className="mt-1.5 text-[13px] text-[#525252] max-w-xs">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
