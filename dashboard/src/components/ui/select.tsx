import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'
import { type SelectHTMLAttributes, forwardRef, useId } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  readonly label?: string
  readonly options: { value: string; label: string }[]
  readonly placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, placeholder, className, id, ...props }, ref) => {
    const selectId = id ?? useId()

    return (
      <div>
        {label && (
          <label htmlFor={selectId} className="mb-1 block text-[11px] text-text-tertiary">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            className={cn(
              'h-8 w-full appearance-none rounded-md border border-border bg-transparent px-2.5 pr-7 text-[13px] text-text-primary',
              'focus:outline-none focus:border-border-focus focus:ring-1 focus:ring-focus',
              className,
            )}
            {...props}
          >
            {placeholder && (
              <option value="" className="bg-elevated text-text-muted">
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-elevated text-text-primary">
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-text-muted" />
        </div>
      </div>
    )
  },
)

Select.displayName = 'Select'
