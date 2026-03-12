import { cn } from '@/lib/utils'

interface ToggleSwitchProps {
  readonly checked: boolean
  readonly onChange: (checked: boolean) => void
  readonly label?: string
  readonly disabled?: boolean
  readonly className?: string
}

export const ToggleSwitch = ({ checked, onChange, label, disabled, className }: ToggleSwitchProps) => {
  return (
    <label className={cn('inline-flex items-center gap-2 cursor-pointer', disabled && 'opacity-40 cursor-not-allowed', className)}>
      {label && <span className="text-xs text-text-secondary">{label}</span>}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          'relative h-4 w-8 rounded-lg',
          checked ? 'bg-success' : 'bg-border',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 size-3 rounded-full bg-accent-text dark:bg-text-primary',
            checked ? 'left-[18px]' : 'left-0.5',
          )}
        />
      </button>
    </label>
  )
}
