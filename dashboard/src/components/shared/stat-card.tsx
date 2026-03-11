import { Sparkline } from '@/components/charts/sparkline'
import type { TimeseriesPoint } from '@/lib/types'
import { cn } from '@/lib/utils'
import { TrendingDown, TrendingUp } from 'lucide-react'
import type { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: string
  trend?: number
  trendLabel?: string
  icon?: ReactNode
  sparklineData?: TimeseriesPoint[]
  sparklineColor?: string
  className?: string
}

export function StatCard({
  label,
  value,
  trend,
  trendLabel,
  icon,
  sparklineData,
  sparklineColor,
  className,
}: StatCardProps) {
  const trendUp = trend !== undefined && trend > 0
  const trendDown = trend !== undefined && trend < 0

  return (
    <div
      className={cn(
        'group relative flex flex-col justify-between rounded-xl border border-white/[6%] bg-white/[3%] p-6 transition-all duration-200 hover:border-white/[10%] hover:bg-white/[5%] hover:-translate-y-0.5',
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
            {label}
          </p>
          <p className="mt-2 text-3xl font-bold text-white tracking-tight">{value}</p>
        </div>
        {icon && (
          <div className="rounded-lg bg-white/[4%] p-2.5 text-zinc-500 group-hover:bg-white/[6%] group-hover:text-zinc-400 transition-all duration-200">
            {icon}
          </div>
        )}
      </div>
      <div className="mt-4 flex items-center justify-between">
        {trend !== undefined && (
          <div
            className={cn(
              'flex items-center gap-1 text-xs font-medium',
              trendUp && 'text-emerald-400',
              trendDown && 'text-red-400',
              !trendUp && !trendDown && 'text-zinc-500',
            )}
          >
            {trendUp && <TrendingUp className="h-3 w-3" />}
            {trendDown && <TrendingDown className="h-3 w-3" />}
            <span>
              {trendUp ? '+' : ''}
              {trend.toFixed(1)}%
            </span>
            {trendLabel && <span className="text-zinc-600 ml-1">{trendLabel}</span>}
          </div>
        )}
        {sparklineData && sparklineData.length > 0 && (
          <Sparkline data={sparklineData} color={sparklineColor} />
        )}
      </div>
    </div>
  )
}
