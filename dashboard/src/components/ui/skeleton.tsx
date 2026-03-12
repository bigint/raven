import { cn } from '@/lib/utils'

export const Skeleton = ({ className }: { readonly className?: string }) => {
  return <div className={cn('rounded-md bg-surface-hover', className)} />
}

export const SkeletonCard = () => {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <Skeleton className="h-3 w-20 mb-3" />
      <Skeleton className="h-6 w-32 mb-2" />
      <Skeleton className="h-4 w-16" />
    </div>
  )
}

export const SkeletonTable = ({ rows = 5 }: { readonly rows?: number }) => {
  return (
    <div className="space-y-0">
      <div className="flex gap-4 h-8 items-center border-b border-border px-3">
        <Skeleton className="h-2.5 w-20" />
        <Skeleton className="h-2.5 w-16" />
        <Skeleton className="h-2.5 w-24" />
        <Skeleton className="h-2.5 w-12" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 h-9 items-center border-b border-surface-hover px-3">
          <Skeleton className="h-2.5 w-24" />
          <Skeleton className="h-2.5 w-16" />
          <Skeleton className="h-2.5 w-28" />
          <Skeleton className="h-2.5 w-14" />
        </div>
      ))}
    </div>
  )
}
