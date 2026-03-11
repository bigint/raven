import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('rounded-md bg-white/[4%] animate-shimmer', className)} />
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-white/[6%] bg-[#0f0f0f] p-6">
      <Skeleton className="h-4 w-24 mb-3" />
      <Skeleton className="h-8 w-32 mb-2" />
      <Skeleton className="h-3 w-20" />
    </div>
  )
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={`skeleton-row-${i}`} className="h-12 w-full" />
      ))}
    </div>
  )
}
