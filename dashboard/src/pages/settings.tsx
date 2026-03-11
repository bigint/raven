import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { SkeletonCard } from '@/components/ui/skeleton'
import { apiClient } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'

function SettingRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-xs text-[#a3a3a3]">{label}</span>
      <span className="text-xs font-medium text-[#fafafa]">{value}</span>
    </div>
  )
}

export default function SettingsPage() {
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => apiClient.getSettings(),
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-[13px] font-semibold text-[#fafafa]">Settings</h1>
        </div>
        <SkeletonCard />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[13px] font-semibold text-[#fafafa]">Settings</h1>
      </div>

      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
        <h3 className="text-[9px] font-medium text-[#333] uppercase tracking-[1px] mb-3">
          Gateway Configuration
        </h3>

        <SettingRow
          label="Version"
          value={
            <span className="font-mono text-xs">{settings?.version ?? 'Unknown'}</span>
          }
        />
        <Separator />
        <SettingRow
          label="Uptime"
          value={
            <span className="font-mono text-xs">{settings?.uptime ?? 'Unknown'}</span>
          }
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
              )) ?? <span className="text-[#525252]">None</span>}
            </div>
          }
        />
      </div>
    </div>
  )
}
