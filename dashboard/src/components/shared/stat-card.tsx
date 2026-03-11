import { Sparkline } from '@/components/charts/sparkline'
import type { TimeseriesPoint } from '@/lib/types'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string
  trend?: number
  trendLabel?: string
  icon?: React.ReactNode
  sparklineData?: TimeseriesPoint[]
  sparklineColor?: string
  className?: string
}

export function StatCard({
  label,
  value,
  trend,
  trendLabel,
  sparklineData,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'relative flex justify-between rounded-[10px] border border-white/[0.08] p-4',
        className,
      )}
    >
      <div className="flex flex-col min-w-0">
        <p className="text-[11px] text-[#525252] uppercase tracking-[0.02em]">
          {label}
        </p>
        <p className="mt-2 text-2xl font-semibold text-[#fafafa] tracking-tight">{value}</p>
        {trend !== undefined && (
          <p className="mt-1.5 text-[11px] text-[#a3a3a3]">
            {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
            {trendLabel && <span className="text-[#525252] ml-1">{trendLabel}</span>}
          </p>
        )}
      </div>
      {sparklineData && sparklineData.length > 0 && (
        <div className="shrink-0 mt-1">
          <Sparkline data={sparklineData} />
        </div>
      )}
    </div>
  )
}
