import { cn } from '@/lib/utils'
import { forwardRef, type InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div>
        {label && (
          <label className="block text-[11px] text-[#525252] mb-1">{label}</label>
        )}
        <input
          ref={ref}
          className={cn(
            'h-8 w-full rounded-md border bg-transparent px-2.5 text-[13px] text-[#fafafa] placeholder:text-[#333]',
            'focus:outline-none focus:border-white/[0.15] focus:ring-1 focus:ring-white/[0.10]',
            error ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20' : 'border-white/[0.06]',
            className,
          )}
          {...props}
        />
        {error && <p className="mt-1 text-[11px] text-[#ef4444]">{error}</p>}
      </div>
    )
  },
)

Input.displayName = 'Input'
