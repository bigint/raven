import { cn } from '@/lib/utils'
import { Calendar } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface DateRangePickerProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

const presets = ['1h', '24h', '7d', '30d']

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [showCustom, setShowCustom] = useState(false)
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const handlePreset = (preset: string) => {
    setShowCustom(false)
    onChange(preset)
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Calendar className="h-3.5 w-3.5 text-[#333]" />
      <div className="inline-flex rounded-md border border-white/[0.06] bg-white/[0.02] p-0.5">
        {presets.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => handlePreset(preset)}
            className={cn(
              'px-3 py-1 text-[11px] font-medium rounded-[5px]',
              value === preset && !showCustom
                ? 'bg-white/[0.08] text-[#fafafa]'
                : 'text-[#525252] hover:text-[#a3a3a3]',
            )}
          >
            {preset}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowCustom(!showCustom)}
          className={cn(
            'px-3 py-1 text-[11px] font-medium rounded-[5px]',
            showCustom ? 'bg-white/[0.08] text-[#fafafa]' : 'text-[#525252] hover:text-[#a3a3a3]',
          )}
        >
          Custom
        </button>
      </div>
      {showCustom && (
        <div className="flex items-center gap-2">
          <input
            type="datetime-local"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="h-8 rounded-md border border-white/[0.06] bg-transparent px-2 text-[11px] text-[#fafafa] focus:outline-none focus:border-white/[0.15]"
          />
          <span className="text-[11px] text-[#333]">to</span>
          <input
            type="datetime-local"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="h-8 rounded-md border border-white/[0.06] bg-transparent px-2 text-[11px] text-[#fafafa] focus:outline-none focus:border-white/[0.15]"
          />
          <Button
            size="sm"
            onClick={() => {
              if (customStart && customEnd) onChange(`${customStart}|${customEnd}`)
            }}
          >
            Apply
          </Button>
        </div>
      )}
    </div>
  )
}

export function getDateRange(range: string): { start: string; end: string } {
  if (range.includes('|')) {
    const [start = '', end = ''] = range.split('|')
    return { start, end }
  }
  const now = new Date()
  const end = now.toISOString()
  const ms: Record<string, number> = {
    '1h': 3600000,
    '24h': 86400000,
    '7d': 604800000,
    '30d': 2592000000,
  }
  const start = new Date(now.getTime() - (ms[range] ?? 86400000)).toISOString()
  return { start, end }
}

export type Granularity = 'minute' | 'hour' | 'day' | 'week' | 'month'

export function getGranularity(range: string): Granularity {
  if (range.includes('|')) return 'hour'
  const map: Record<string, Granularity> = {
    '1h': 'minute',
    '24h': 'hour',
    '7d': 'hour',
    '30d': 'day',
  }
  return map[range] ?? 'hour'
}
