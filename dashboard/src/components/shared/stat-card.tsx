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
        'relative flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-900/80 p-5',
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold text-white tracking-tight">{value}</p>
        </div>
        {icon && (
          <div className="rounded-lg bg-zinc-800 p-2 text-zinc-400 shrink-0 ml-3">
            {icon}
          </div>
        )}
      </div>
      {(trend !== undefined || (sparklineData && sparklineData.length > 0)) && (
        <div className="mt-3 flex items-center justify-between pt-3 border-t border-zinc-800/60">
          {trend !== undefined ? (
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
          ) : (
            <div />
          )}
          {sparklineData && sparklineData.length > 0 && (
            <Sparkline data={sparklineData} color={sparklineColor} />
          )}
        </div>
      )}
    </div>
  )
}
