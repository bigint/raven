import { Sparkline } from '@/components/charts/sparkline'
import type { TimeseriesPoint } from '@/lib/types'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string
  sparklineData?: TimeseriesPoint[]
  className?: string
}

export function StatCard({ label, value, sparklineData, className }: StatCardProps) {
  return (
    <div
      className={cn(
        'flex justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3.5 py-3 hover:border-white/[0.10]',
        className,
      )}
    >
      <div className="flex flex-col min-w-0">
        <p className="text-[10px] text-[#525252] uppercase tracking-[0.5px]">{label}</p>
        <p className="mt-2 text-[22px] font-semibold text-[#fafafa] tracking-[-0.5px]">{value}</p>
      </div>
      {sparklineData && sparklineData.length > 0 && (
        <div className="shrink-0 self-end">
          <Sparkline data={sparklineData} />
        </div>
      )}
    </div>
  )
}
