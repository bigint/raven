import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import { type ReactNode, useEffect } from 'react'

interface DialogProps {
  readonly open: boolean
  readonly onClose: () => void
  readonly children: ReactNode
  readonly className?: string
}

export const Dialog = ({ open, onClose, children, className }: DialogProps) => {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-overlay" onClick={onClose} />
      <div
        className={cn(
          'relative z-10 w-full max-w-[480px] rounded-lg border border-border-hover bg-elevated p-5',
          className,
        )}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-text-muted hover:text-text-secondary"
        >
          <X className="size-3.5" />
        </button>
        {children}
      </div>
    </div>
  )
}

export const DialogHeader = ({ className, children }: { readonly className?: string; readonly children: ReactNode }) => {
  return <div className={cn('mb-4', className)}>{children}</div>
}

export const DialogTitle = ({ className, children }: { readonly className?: string; readonly children: ReactNode }) => {
  return (
    <h2 className={cn('text-[13px] font-semibold text-text-primary', className)}>{children}</h2>
  )
}

export const DialogDescription = ({ className, children }: { readonly className?: string; readonly children: ReactNode }) => {
  return (
    <p className={cn('mt-1 text-xs text-text-tertiary', className)}>{children}</p>
  )
}

export const DialogClose = ({ onClick, children }: { readonly onClick: () => void; readonly children: ReactNode }) => {
  return (
    <button type="button" onClick={onClick} className="text-text-secondary hover:text-text-primary">
      {children}
    </button>
  )
}

export const DialogFooter = ({ className, children }: { readonly className?: string; readonly children: ReactNode }) => {
  return (
    <div
      className={cn('mt-4 flex justify-end gap-2 border-t border-border pt-3', className)}
    >
      {children}
    </div>
  )
}
