import { cn } from '@/lib/utils'
import { type ReactNode, useState } from 'react'

interface TooltipProps {
  content: string
  children: ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
}

const positions = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
  left: 'right-full top-1/2 -translate-y-1/2 mr-1.5',
  right: 'left-full top-1/2 -translate-y-1/2 ml-1.5',
}

export function Tooltip({ content, children, side = 'top', className }: TooltipProps) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative inline-flex" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div
          className={cn(
            'absolute z-50 whitespace-nowrap rounded-[4px] border border-white/[0.08] bg-[#1a1a1a] px-2 py-1 text-[11px] text-[#a3a3a3]',
            positions[side],
            className,
          )}
        >
          {content}
        </div>
      )}
    </div>
  )
}
