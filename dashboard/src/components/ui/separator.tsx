import { cn } from '@/lib/utils'

interface SeparatorProps {
  readonly orientation?: 'horizontal' | 'vertical'
  readonly className?: string
}

export const Separator = ({ orientation = 'horizontal', className }: SeparatorProps) => {
  return (
    <div
      className={cn(
        'bg-border',
        orientation === 'horizontal' ? 'h-px w-full' : 'w-px h-full',
        className,
      )}
    />
  )
}
