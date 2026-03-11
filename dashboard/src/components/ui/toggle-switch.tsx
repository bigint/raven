import { cn } from '@/lib/utils'

interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
  className?: string
}

export function ToggleSwitch({ checked, onChange, label, disabled, className }: ToggleSwitchProps) {
  return (
    <label className={cn('inline-flex items-center gap-2 cursor-pointer', disabled && 'opacity-40 cursor-not-allowed', className)}>
      {label && <span className="text-xs text-[#a3a3a3]">{label}</span>}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          'relative h-4 w-8 rounded-lg',
          checked ? 'bg-[#22c55e]' : 'bg-white/[0.06]',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-3 w-3 rounded-full bg-[#fafafa]',
            checked ? 'left-[18px]' : 'left-0.5',
          )}
        />
      </button>
    </label>
  )
}
