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
    <div className={cn('flex flex-col items-center justify-center py-20 text-center', className)}>
      <div className="rounded-2xl bg-white/[4%] border border-white/[6%] p-5 mb-6 animate-float">
        {icon || <Inbox className="h-8 w-8 text-zinc-600" />}
      </div>
      <h3 className="text-base font-semibold bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">
        {title}
      </h3>
      {description && (
        <p className="mt-2 text-sm text-zinc-600 max-w-md leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
