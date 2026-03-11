import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'
import { forwardRef, type SelectHTMLAttributes } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: { value: string; label: string }[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, placeholder, className, ...props }, ref) => {
    return (
      <div>
        {label && (
          <label className="block text-[11px] text-[#525252] mb-1">{label}</label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={cn(
              'h-8 w-full appearance-none rounded-md border border-white/[0.06] bg-transparent px-2.5 pr-7 text-[13px] text-[#fafafa]',
              'focus:outline-none focus:border-white/[0.15] focus:ring-1 focus:ring-white/[0.10]',
              className,
            )}
            {...props}
          >
            {placeholder && (
              <option value="" className="bg-[#111] text-[#333]">
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-[#111] text-[#fafafa]">
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[#333]" />
        </div>
      </div>
    )
  },
)

Select.displayName = 'Select'
