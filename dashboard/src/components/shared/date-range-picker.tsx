import { cn } from '@/lib/utils'
import { Calendar } from 'lucide-react'
import { useState } from 'react'

interface DateRangePickerProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

const presets = [
  { value: '1h', label: '1h' },
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: 'custom', label: 'Custom' },
]

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [showCustom, setShowCustom] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const handlePresetClick = (preset: string) => {
    if (preset === 'custom') {
      setShowCustom(!showCustom)
    } else {
      setShowCustom(false)
      onChange(preset)
    }
  }

  const handleCustomApply = () => {
    if (startDate && endDate) {
      onChange(`${startDate}|${endDate}`)
      setShowCustom(false)
    }
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Calendar className="h-3.5 w-3.5 text-zinc-600 mr-1.5" />
      <div className="inline-flex items-center gap-0.5 rounded-lg border border-white/[6%] bg-white/[2%] p-0.5">
        {presets.map((preset) => (
          <button
            type="button"
            key={preset.value}
            onClick={() => handlePresetClick(preset.value)}
            className={cn(
              'px-2.5 py-1 text-[11px] font-medium rounded-md transition-all duration-200 cursor-pointer',
              value === preset.value || (preset.value === 'custom' && value.includes('|'))
                ? 'bg-white/[8%] text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[4%]',
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>
      {showCustom && (
        <div className="flex items-center gap-2 ml-2 animate-slide-in">
          <input
            type="datetime-local"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-7 rounded-lg border border-white/[8%] bg-white/[3%] px-2 text-xs text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          />
          <span className="text-zinc-600 text-xs">to</span>
          <input
            type="datetime-local"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-7 rounded-lg border border-white/[8%] bg-white/[3%] px-2 text-xs text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          />
          <button
            type="button"
            onClick={handleCustomApply}
            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-indigo-500 text-white hover:bg-indigo-400 transition-all duration-200 cursor-pointer"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  )
}

export function getDateRange(value: string): { start: string; end: string } {
  if (value.includes('|')) {
    const [start, end] = value.split('|')
    return { start: start ?? '', end: end ?? '' }
  }

  const now = new Date()
  const end = now.toISOString()
  let start: Date

  switch (value) {
    case '1h':
      start = new Date(now.getTime() - 60 * 60 * 1000)
      break
    case '24h':
      start = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      break
    case '7d':
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case '30d':
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
    default:
      start = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  }

  return { start: start.toISOString(), end }
}

export function getGranularity(value: string): 'minute' | 'hour' | 'day' | 'week' | 'month' {
  switch (value) {
    case '1h':
      return 'minute'
    case '24h':
      return 'hour'
    case '7d':
      return 'day'
    case '30d':
      return 'day'
    default:
      return 'hour'
  }
}
