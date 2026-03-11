import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import { type ReactNode, useEffect } from 'react'

interface DialogProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  className?: string
}

export function Dialog({ open, onClose, children, className }: DialogProps) {
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
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div
        className={cn(
          'relative z-10 w-full max-w-[480px] rounded-lg border border-white/[0.08] bg-[#111] p-5',
          className,
        )}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-[#333] hover:text-[#a3a3a3]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        {children}
      </div>
    </div>
  )
}

export function DialogHeader({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('mb-4', className)}>{children}</div>
}

export function DialogTitle({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <h2 className={cn('text-[13px] font-semibold text-[#fafafa]', className)}>{children}</h2>
  )
}

export function DialogDescription({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <p className={cn('mt-1 text-xs text-[#525252]', className)}>{children}</p>
  )
}

export function DialogClose({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="text-[#a3a3a3] hover:text-[#fafafa]">
      {children}
    </button>
  )
}

export function DialogFooter({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn('mt-4 flex justify-end gap-2 border-t border-white/[0.06] pt-3', className)}
    >
      {children}
    </div>
  )
}
