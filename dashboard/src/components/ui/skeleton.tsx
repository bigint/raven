import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('rounded-md bg-white/[0.04] animate-shimmer', className)} />
}

export function SkeletonCard() {
  return (
    <div className="rounded-[10px] border border-white/[0.08] bg-transparent p-5">
      <Skeleton className="h-3 w-20 mb-3" />
      <Skeleton className="h-7 w-28 mb-2" />
      <Skeleton className="h-3 w-16" />
    </div>
  )
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={`skeleton-row-${i}`} className="h-11 w-full" />
      ))}
    </div>
  )
}
