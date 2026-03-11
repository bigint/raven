import { EmptyState } from '@/components/shared/empty-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { SkeletonCard } from '@/components/ui/skeleton'
import {
  useCreateProviderConfig,
  useDeleteProviderConfig,
  useProviderHealth,
  useProviders,
  useUpdateProviderConfig,
} from '@/hooks/use-providers'
import { formatLatency, formatPercent } from '@/lib/utils'
import type { Provider } from '@/lib/types'
import {
  Activity,
  Check,
  Eye,
  EyeOff,
  Key,
  Loader2,
  Server,
  Settings,
  Trash2,
  Wifi,
  X,
} from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'

interface ConfigDialogState {
  open: boolean
  provider: Provider | null
  isEditing: boolean
}

function HealthBadge({ status }: { status: string }) {
  if (status === 'healthy') return <Badge variant="success">Healthy</Badge>
  if (status === 'degraded') return <Badge variant="warning">Degraded</Badge>
  if (status === 'down') return <Badge variant="error">Down</Badge>
  return <Badge variant="default">Unconfigured</Badge>
}

function ProviderCard({
  provider,
  onConfigure,
}: {
  provider: Provider
  onConfigure: (provider: Provider, isEditing: boolean) => void
}) {
  const { data: health } = useProviderHealth(provider.id)
  const isConfigured = provider.status !== 'down' || provider.enabled
  const hasModels = provider.models.length > 0

  return (
    <Card>
      <CardContent>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-white/5 p-2.5">
              <Server className="h-5 w-5 text-text-dark-secondary" />
            </div>
            <div>
              <h3 className="font-medium text-text-dark">{provider.display_name}</h3>
              <p className="text-xs text-text-dark-secondary">{provider.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isConfigured ? (
              <Badge variant="success">Configured</Badge>
            ) : (
              <Badge variant="default">Not configured</Badge>
            )}
          </div>
        </div>

        {isConfigured && (
          <>
            <div className="mb-4 flex items-center gap-2">
              <Key className="h-3.5 w-3.5 text-text-dark-secondary" />
              <span className="text-xs text-text-dark-secondary font-mono">
                {provider.base_url ? `${provider.base_url.slice(0, 30)}...` : 'Default URL'}
              </span>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <HealthBadge status={provider.status} />
              {provider.enabled ? (
                <Badge variant="success">
                  <Check className="h-3 w-3" />
                  Enabled
                </Badge>
              ) : (
                <Badge variant="default">
                  <X className="h-3 w-3" />
                  Disabled
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
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
            </div>
          </>
        )}

        <div className="mb-4">
          <p className="text-xs text-text-dark-secondary mb-2">
            Models ({provider.models.length})
          </p>
          {hasModels ? (
            <div className="flex flex-wrap gap-1">
              {provider.models.slice(0, 4).map((model) => (
                <Badge key={model} variant="default">
                  {model}
                </Badge>
              ))}
              {provider.models.length > 4 && (
                <Badge variant="default">+{provider.models.length - 4} more</Badge>
              )}
            </div>
          ) : (
            <p className="text-xs text-text-dark-secondary/60">No models available</p>
          )}
        </div>

        <Button
          variant={isConfigured ? 'secondary' : 'primary'}
          size="sm"
          className="w-full"
          onClick={() => onConfigure(provider, isConfigured)}
        >
          {isConfigured ? (
            <>
              <Settings className="h-3.5 w-3.5" />
              Edit Configuration
            </>
          ) : (
            <>
              <Key className="h-3.5 w-3.5" />
              Configure
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

function ConfigureProviderDialog({
  state,
  onClose,
}: {
  state: ConfigDialogState
  onClose: () => void
}) {
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [enabled, setEnabled] = useState(true)
  const [showKey, setShowKey] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createConfig = useCreateProviderConfig()
  const updateConfig = useUpdateProviderConfig()
  const deleteConfig = useDeleteProviderConfig()

  const resetForm = useCallback(() => {
    setApiKey('')
    setBaseUrl(state.provider?.base_url ?? '')
    setEnabled(state.provider?.enabled ?? true)
    setShowKey(false)
    setShowDeleteConfirm(false)
    setError(null)
  }, [state.provider])

  // Reset form when dialog opens
  const handleClose = useCallback(() => {
    resetForm()
    onClose()
  }, [resetForm, onClose])

  const handleSave = useCallback(async () => {
    if (!state.provider) return
    setError(null)

    try {
      if (state.isEditing) {
        const data: { api_key?: string; base_url?: string; enabled?: boolean } = {
          enabled,
        }
        if (apiKey) data.api_key = apiKey
        if (baseUrl) data.base_url = baseUrl

        await updateConfig.mutateAsync({
          name: state.provider.name,
          data,
        })
      } else {
        if (!apiKey) {
          setError('API key is required')
          return
        }
        await createConfig.mutateAsync({
          name: state.provider.name,
          api_key: apiKey,
          base_url: baseUrl || undefined,
          enabled,
        })
      }
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration')
    }
  }, [state, apiKey, baseUrl, enabled, createConfig, updateConfig, handleClose])

  const handleDelete = useCallback(async () => {
    if (!state.provider) return
    setError(null)

    try {
      await deleteConfig.mutateAsync(state.provider.name)
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove configuration')
    }
  }, [state.provider, deleteConfig, handleClose])

  const isSaving = createConfig.isPending || updateConfig.isPending
  const isDeleting = deleteConfig.isPending

  if (!state.provider) return null

  return (
    <Dialog open={state.open} onClose={handleClose}>
      <DialogClose onClose={handleClose} />
      <DialogHeader>
        <DialogTitle>
          {state.isEditing ? 'Edit' : 'Configure'} {state.provider.display_name}
        </DialogTitle>
        <DialogDescription>
          {state.isEditing
            ? 'Update the API key and settings for this provider.'
            : 'Enter your API key to enable this provider.'}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
          <Server className="h-4 w-4 text-text-dark-secondary" />
          <span className="text-sm text-text-dark">{state.provider.name}</span>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="provider-api-key" className="text-sm font-medium text-text-dark-secondary">
            API Key {state.isEditing && '(leave blank to keep current)'}
          </label>
          <div className="relative">
            <input
              id="provider-api-key"
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={state.isEditing ? 'Enter new key to update...' : 'Enter API key...'}
              className="h-9 w-full rounded-lg border border-border-dark bg-bg-dark-tertiary px-3 pr-10 text-sm text-text-dark placeholder:text-text-dark-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors font-mono"
            />
            <button
              type="button"
              onClick={() => setShowKey((prev) => !prev)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-dark-secondary hover:text-text-dark transition-colors"
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <Input
          label="Base URL (optional)"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder={state.provider.base_url || 'https://api.provider.com/v1'}
        />

        <div className="flex items-center justify-between rounded-lg border border-border-dark bg-bg-dark-tertiary px-3 py-2.5">
          <div>
            <p className="text-sm text-text-dark">Enable Provider</p>
            <p className="text-xs text-text-dark-secondary mt-0.5">
              Route requests to this provider when enabled
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEnabled((prev) => !prev)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              enabled ? 'bg-primary' : 'bg-white/20'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {error && (
          <div className="rounded-lg bg-error/10 border border-error/20 px-3 py-2">
            <p className="text-sm text-error">{error}</p>
          </div>
        )}
      </div>

      {state.isEditing && !showDeleteConfirm && (
        <div className="mt-4 pt-4 border-t border-border-dark">
          <Button
            variant="ghost"
            size="sm"
            className="text-error hover:text-error hover:bg-error/10"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isDeleting}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove Configuration
          </Button>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="mt-4 pt-4 border-t border-border-dark">
          <div className="rounded-lg bg-error/10 border border-error/20 p-3">
            <p className="text-sm text-error font-medium mb-2">
              Are you sure you want to remove this configuration?
            </p>
            <p className="text-xs text-text-dark-secondary mb-3">
              This will delete the API key and disable the provider. This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button variant="danger" size="sm" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Removing...
                  </>
                ) : (
                  'Yes, Remove'
                )}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      <DialogFooter>
        <Button variant="secondary" onClick={handleClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Configuration'
          )}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}

export default function ProvidersPage() {
  const { data: providers, isLoading } = useProviders()
  const [dialogState, setDialogState] = useState<ConfigDialogState>({
    open: false,
    provider: null,
    isEditing: false,
  })

  const handleConfigure = useCallback((provider: Provider, isEditing: boolean) => {
    setDialogState({ open: true, provider, isEditing })
  }, [])

  const handleCloseDialog = useCallback(() => {
    setDialogState({ open: false, provider: null, isEditing: false })
  }, [])

  const sortedProviders = useMemo(() => {
    if (!providers) return []
    const configured = providers.filter(
      (p) => p.status !== 'down' || p.enabled,
    )
    const unconfigured = providers.filter(
      (p) => p.status === 'down' && !p.enabled,
    )
    return [...configured, ...unconfigured]
  }, [providers])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-dark">Providers</h1>
          <p className="text-sm text-text-dark-secondary mt-1">
            Configure your AI provider API keys below. Keys are stored securely in the gateway
            database.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-text-dark-secondary">
          <Activity className="h-3.5 w-3.5" />
          Auto-refreshes every 30s
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={`skel-${i}`} />
          ))}
        </div>
      ) : sortedProviders.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedProviders.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              onConfigure={handleConfigure}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No providers available"
          description="No AI providers are registered in the gateway."
          icon={<Wifi className="h-8 w-8 text-text-dark-secondary" />}
        />
      )}

      <ConfigureProviderDialog state={dialogState} onClose={handleCloseDialog} />
    </div>
  )
}
