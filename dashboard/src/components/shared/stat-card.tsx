import { Sparkline } from '@/components/charts/sparkline'
import type { TimeseriesPoint } from '@/lib/types'
import { cn } from '@/lib/utils'

interface StatCardProps {
  readonly label: string
  readonly value: string
  readonly sparklineData?: TimeseriesPoint[]
  readonly className?: string
}

export const StatCard = ({ label, value, sparklineData, className }: StatCardProps) => {
  return (
    <div
      className={cn(
        'flex justify-between rounded-lg border border-border bg-surface px-3.5 py-3 hover:border-border-hover',
        className,
      )}
    >
      <div className="flex flex-col min-w-0">
        <p className="text-[10px] text-text-tertiary uppercase tracking-[0.5px]">{label}</p>
        <p className="mt-2 text-[22px] font-semibold text-text-primary tracking-[-0.5px]">
          {value}
        </p>
      </div>
      {sparklineData && sparklineData.length > 0 && (
        <div className="shrink-0 self-end">
          <Sparkline data={sparklineData} />
        </div>
      )}
    </div>
  )
}
