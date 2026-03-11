import { EmptyState } from '@/components/shared/empty-state'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { SkeletonCard } from '@/components/ui/skeleton'
import { useProviderHealth, useProviders } from '@/hooks/use-providers'
import { formatLatency, formatPercent } from '@/lib/utils'
import { Activity, Server, Wifi } from 'lucide-react'

function ProviderCard({
  providerId,
  name,
  displayName,
  status,
  models,
}: {
  providerId: string
  name: string
  displayName: string
  status: string
  models: string[]
}) {
  const { data: health } = useProviderHealth(providerId)

  return (
    <Card>
      <CardContent>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-white/5 p-2.5">
              <Server className="h-5 w-5 text-text-dark-secondary" />
            </div>
            <div>
              <h3 className="font-medium text-text-dark">{displayName}</h3>
              <p className="text-xs text-text-dark-secondary">{name}</p>
            </div>
          </div>
          <Badge
            variant={status === 'healthy' ? 'success' : status === 'degraded' ? 'warning' : 'error'}
          >
            {status}
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-xs text-text-dark-secondary">Latency</p>
            <p className="text-sm font-medium mt-1">
              {health ? formatLatency(health.latency_ms) : '--'}
            </p>
          </div>
          <div>
            <p className="text-xs text-text-dark-secondary">Error Rate</p>
            <p className="text-sm font-medium mt-1">
              {health ? formatPercent(health.error_rate) : '--'}
            </p>
          </div>
          <div>
            <p className="text-xs text-text-dark-secondary">Connections</p>
            <p className="text-sm font-medium mt-1">{health?.active_connections ?? '--'}</p>
          </div>
        </div>

        <div>
          <p className="text-xs text-text-dark-secondary mb-2">Models ({models.length})</p>
          <div className="flex flex-wrap gap-1">
            {models.slice(0, 5).map((model) => (
              <Badge key={model} variant="default">
                {model}
              </Badge>
            ))}
            {models.length > 5 && <Badge variant="default">+{models.length - 5} more</Badge>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function ProvidersPage() {
  const { data: providers, isLoading } = useProviders()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-dark">Providers</h1>
          <p className="text-sm text-text-dark-secondary mt-1">
            Monitor provider health and status
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-text-dark-secondary">
          <Activity className="h-3.5 w-3.5" />
          Auto-refreshes every 30s
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={`skel-${i}`} />
          ))}
        </div>
      ) : providers && providers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {providers.map((provider) => (
            <ProviderCard
              key={provider.id}
              providerId={provider.id}
              name={provider.name}
              displayName={provider.display_name}
              status={provider.status}
              models={provider.models}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No providers configured"
          description="Configure AI providers in the gateway to see their status here."
          icon={<Wifi className="h-8 w-8 text-text-dark-secondary" />}
        />
      )}
    </div>
  )
}
