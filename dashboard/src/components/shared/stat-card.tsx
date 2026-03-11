import { Sparkline } from '@/components/charts/sparkline'
import { Card } from '@/components/ui/card'
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
    <Card className={cn('flex flex-col justify-between', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-text-dark-secondary uppercase tracking-wider">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold text-text-dark">{value}</p>
        </div>
        {icon && <div className="text-text-dark-secondary">{icon}</div>}
      </div>
      <div className="mt-3 flex items-center justify-between">
        {trend !== undefined && (
          <div
            className={cn(
              'flex items-center gap-1 text-xs font-medium',
              trendUp && 'text-success',
              trendDown && 'text-error',
              !trendUp && !trendDown && 'text-text-dark-secondary',
            )}
          >
            {trendUp && <TrendingUp className="h-3 w-3" />}
            {trendDown && <TrendingDown className="h-3 w-3" />}
            <span>
              {trendUp ? '+' : ''}
              {trend.toFixed(1)}%
            </span>
            {trendLabel && <span className="text-text-dark-secondary ml-1">{trendLabel}</span>}
          </div>
        )}
        {sparklineData && sparklineData.length > 0 && (
          <Sparkline data={sparklineData} color={sparklineColor} />
        )}
      </div>
    </Card>
  )
}
