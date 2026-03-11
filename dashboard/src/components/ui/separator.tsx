import { cn } from '@/lib/utils'

interface SeparatorProps {
  orientation?: 'horizontal' | 'vertical'
  className?: string
}

export function Separator({ orientation = 'horizontal', className }: SeparatorProps) {
  return (
    <div
      className={cn(
        'bg-border-dark shrink-0',
        orientation === 'horizontal' ? 'h-px w-full' : 'w-px h-full',
        className,
      )}
    />
  )
}
