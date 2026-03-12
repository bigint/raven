import { cn } from '@/lib/utils'
import { Calendar } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface DateRangePickerProps {
  readonly value: string
  readonly onChange: (value: string) => void
  readonly className?: string
}

const presets = ['1h', '24h', '7d', '30d']

export const DateRangePicker = ({ value, onChange, className }: DateRangePickerProps) => {
  const [showCustom, setShowCustom] = useState(false)
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const handlePreset = (preset: string) => {
    setShowCustom(false)
    onChange(preset)
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Calendar className="size-3.5 text-text-muted" />
      <div className="inline-flex rounded-md border border-border bg-surface p-0.5">
        {presets.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => handlePreset(preset)}
            className={cn(
              'px-3 py-1 text-[11px] font-medium rounded-[5px]',
              value === preset && !showCustom
                ? 'bg-surface-active text-text-primary'
                : 'text-text-tertiary hover:text-text-secondary',
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
            showCustom ? 'bg-surface-active text-text-primary' : 'text-text-tertiary hover:text-text-secondary',
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
            className="h-8 rounded-md border border-border bg-transparent px-2 text-[11px] text-text-primary focus:outline-none focus:border-border-focus"
          />
          <span className="text-[11px] text-text-muted">to</span>
          <input
            type="datetime-local"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="h-8 rounded-md border border-border bg-transparent px-2 text-[11px] text-text-primary focus:outline-none focus:border-border-focus"
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

export const getDateRange = (range: string): { start: string; end: string } => {
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

export const getGranularity = (range: string): Granularity => {
  if (range.includes('|')) return 'hour'
  const map: Record<string, Granularity> = {
    '1h': 'minute',
    '24h': 'hour',
    '7d': 'hour',
    '30d': 'day',
  }
  return map[range] ?? 'hour'
}
