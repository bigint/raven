'use client'

import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
  id?: string
  className?: string
}

export function Select({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  disabled = false,
  id,
  className = '',
}: SelectProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedLabel = options.find((o) => o.value === value)?.label ?? placeholder

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={value ? '' : 'text-muted-foreground'}>{selectedLabel}</span>
        <ChevronDown
          className={`size-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover py-1 shadow-md ring-1 ring-black/5">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value)
                setOpen(false)
              }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${
                option.value === value ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              <Check
                className={`size-3.5 shrink-0 ${option.value === value ? 'opacity-100' : 'opacity-0'}`}
              />
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
