import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { SkeletonCard } from '@/components/ui/skeleton'
import { useTheme } from '@/hooks/use-theme'
import { apiClient } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { Monitor, Moon, Sun } from 'lucide-react'
import type { ReactNode } from 'react'

const SettingRow = ({ label, value }: { readonly label: string; readonly value: ReactNode }) => {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-xs text-text-secondary">{label}</span>
      <span className="text-xs font-medium text-text-primary">{value}</span>
    </div>
  )
}

const themeOptions = [
  { value: 'light' as const, label: 'Light', icon: Sun },
  { value: 'dark' as const, label: 'Dark', icon: Moon },
  { value: 'system' as const, label: 'System', icon: Monitor },
]

const SettingsPage = () => {
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => apiClient.getSettings(),
  })
  const { theme, setTheme } = useTheme()

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-[13px] font-semibold text-text-primary">Settings</h1>
        </div>
        <SkeletonCard />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[13px] font-semibold text-text-primary">Settings</h1>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <h3 className="text-[9px] font-medium text-text-muted uppercase tracking-[1px] mb-3">
          Appearance
        </h3>

        <SettingRow
          label="Theme"
          value={
            <div className="inline-flex rounded-md border border-border bg-surface p-0.5">
              {themeOptions.map((opt) => {
                const Icon = opt.icon
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTheme(opt.value)}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-[5px]',
                      theme === opt.value
                        ? 'bg-surface-active text-text-primary'
                        : 'text-text-tertiary hover:text-text-secondary',
                    )}
                  >
                    <Icon className="size-3" />
                    {opt.label}
                  </button>
                )
              })}
            </div>
          }
        />
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <h3 className="text-[9px] font-medium text-text-muted uppercase tracking-[1px] mb-3">
          Gateway Configuration
        </h3>

        <SettingRow
          label="Version"
          value={<span className="font-mono text-xs">{settings?.version ?? 'Unknown'}</span>}
        />
        <Separator />
        <SettingRow
          label="Uptime"
          value={<span className="font-mono text-xs">{settings?.uptime ?? 'Unknown'}</span>}
        />
        <Separator />
        <SettingRow
          label="Cache"
          value={
            <Badge variant={settings?.cache_enabled ? 'success' : 'default'}>
              {settings?.cache_enabled ? 'enabled' : 'disabled'}
            </Badge>
          }
        />
        <Separator />
        <SettingRow
          label="Guardrails"
          value={
            <Badge variant={settings?.guardrails_enabled ? 'success' : 'default'}>
              {settings?.guardrails_enabled ? 'enabled' : 'disabled'}
            </Badge>
          }
        />
        <Separator />
        <SettingRow
          label="Rate Limiting"
          value={
            <Badge variant={settings?.rate_limiting_enabled ? 'success' : 'default'}>
              {settings?.rate_limiting_enabled ? 'enabled' : 'disabled'}
            </Badge>
          }
        />
        <Separator />
        <SettingRow
          label="Providers"
          value={
            <div className="flex flex-wrap gap-1">
              {settings?.providers?.map((p) => (
                <Badge key={p} variant="default">
                  {p}
                </Badge>
              )) ?? <span className="text-text-tertiary">None</span>}
            </div>
          }
        />
      </div>
    </div>
  )
}

export default SettingsPage
