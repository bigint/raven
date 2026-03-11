import { cn } from '@/lib/utils'
import { forwardRef, type InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-text-dark-secondary">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'h-9 rounded-lg border border-border-dark bg-bg-dark-tertiary px-3 text-sm text-text-dark placeholder:text-text-dark-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors',
            error && 'border-error focus:ring-error/50',
            className,
          )}
          {...props}
        />
        {error && <p className="text-xs text-error">{error}</p>}
      </div>
    )
  },
)

Input.displayName = 'Input'
