import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { SkeletonCard } from '@/components/ui/skeleton'
import { apiClient } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'

export default function SettingsPage() {
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => apiClient.getSettings(),
    retry: false,
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Settings</h1>
          <p className="text-sm text-neutral-500 mt-1">Gateway configuration</p>
        </div>
        <SkeletonCard />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Settings</h1>
        <p className="text-sm text-neutral-500 mt-1">Gateway configuration and status</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gateway Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <SettingRow label="Version" value={settings?.version ?? 'Unknown'} />
            <Separator />
            <SettingRow label="Uptime" value={settings?.uptime ?? 'Unknown'} />
            <Separator />
            <SettingRow
              label="Cache"
              value={
                <Badge variant={settings?.cache_enabled ? 'success' : 'default'}>
                  {settings?.cache_enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              }
            />
            <Separator />
            <SettingRow
              label="Guardrails"
              value={
                <Badge variant={settings?.guardrails_enabled ? 'success' : 'default'}>
                  {settings?.guardrails_enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              }
            />
            <Separator />
            <SettingRow
              label="Rate Limiting"
              value={
                <Badge variant={settings?.rate_limiting_enabled ? 'success' : 'default'}>
                  {settings?.rate_limiting_enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              }
            />
            <Separator />
            <SettingRow
              label="Providers"
              value={
                <div className="flex flex-wrap gap-1">
                  {settings?.providers?.map((p) => (
                    <Badge key={p} variant="info">
                      {p}
                    </Badge>
                  )) ?? <span className="text-neutral-500">None</span>}
                </div>
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function SettingRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-neutral-500">{label}</span>
      <span className="text-sm font-medium text-neutral-100">{value}</span>
    </div>
  )
}
