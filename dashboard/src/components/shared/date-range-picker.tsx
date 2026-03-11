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
      <Calendar className="h-4 w-4 text-neutral-500 mr-1" />
      {presets.map((preset) => (
        <button
          type="button"
          key={preset.value}
          onClick={() => handlePresetClick(preset.value)}
          className={cn(
            'px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
            value === preset.value || (preset.value === 'custom' && value.includes('|'))
              ? 'bg-primary text-white'
              : 'text-neutral-400 hover:text-neutral-100 hover:bg-white/10',
          )}
        >
          {preset.label}
        </button>
      ))}
      {showCustom && (
        <div className="flex items-center gap-2 ml-2">
          <input
            type="datetime-local"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-7 rounded-md border border-white/10 bg-neutral-800 px-2 text-xs text-neutral-100"
          />
          <span className="text-neutral-500 text-xs">to</span>
          <input
            type="datetime-local"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-7 rounded-md border border-white/10 bg-neutral-800 px-2 text-xs text-neutral-100"
          />
          <button
            type="button"
            onClick={handleCustomApply}
            className="px-2.5 py-1 text-xs font-medium rounded-md bg-primary text-white hover:bg-primary-hover"
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
