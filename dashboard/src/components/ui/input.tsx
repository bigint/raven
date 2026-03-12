import { cn } from '@/lib/utils'
import { type InputHTMLAttributes, forwardRef, useId } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  readonly label?: string
  readonly error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const inputId = id ?? useId()

    return (
      <div>
        {label && (
          <label htmlFor={inputId} className="mb-1 block text-[11px] text-text-tertiary">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            'h-8 w-full rounded-md border bg-transparent px-2.5 text-[13px] text-text-primary placeholder:text-text-muted',
            'focus:outline-none focus:border-border-focus focus:ring-1 focus:ring-focus',
            error
              ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20'
              : 'border-border',
            className,
          )}
          {...props}
        />
        {error && <p className="mt-1 text-[11px] text-error">{error}</p>}
      </div>
    )
  },
)

Input.displayName = 'Input'
