import { cn } from '@/lib/utils'
import { AlertCircle, X } from 'lucide-react'
import type { ReactNode } from 'react'

interface ErrorBannerProps {
  children: ReactNode
  onDismiss?: () => void
  className?: string
}

export function ErrorBanner({ children, onDismiss, className }: ErrorBannerProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md border border-red-500/20 bg-red-500/[0.05] px-3 py-2',
        className,
      )}
    >
      <AlertCircle className="h-3.5 w-3.5 shrink-0 text-error" />
      <span className="flex-1 text-xs text-error">{children}</span>
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="text-text-muted hover:text-text-secondary">
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}
