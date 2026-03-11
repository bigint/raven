import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ErrorBanner } from '@/components/ui/error-banner'
import { Input } from '@/components/ui/input'
import { SkeletonCard } from '@/components/ui/skeleton'
import { ToggleSwitch } from '@/components/ui/toggle-switch'
import {
  useCreateProviderConfig,
  useDeleteProviderConfig,
  useProviderHealth,
  useProviders,
  useUpdateProviderConfig,
} from '@/hooks/use-providers'
import type { Provider } from '@/lib/types'
import { formatLatency, formatPercent } from '@/lib/utils'
import {
  Activity,
  Eye,
  EyeOff,
  Loader2,
  Trash2,
  Wifi,
} from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'

interface ConfigDialogState {
  open: boolean
  provider: Provider | null
  isEditing: boolean
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
    <Card className="hover:border-white/[0.10]">
      <CardContent>
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  provider.status === 'healthy'
                    ? 'bg-[#22c55e]'
                    : provider.status === 'degraded'
                      ? 'bg-[#f59e0b]'
                      : 'bg-[#ef4444]'
                }`}
              />
              <h3 className="text-[13px] font-medium text-[#fafafa]">{provider.display_name}</h3>
            </div>
            <p className="mt-0.5 text-[11px] text-[#525252]">{provider.status}</p>
          </div>
        </div>

        {isConfigured && (
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <p className="text-[9px] font-medium text-[#333] uppercase tracking-[1px]">Latency</p>
              <p className="mt-1 font-mono text-xs font-medium text-[#fafafa]">
                {health ? formatLatency(health.latency_ms) : '--'}
              </p>
            </div>
            <div>
              <p className="text-[9px] font-medium text-[#333] uppercase tracking-[1px]">Errors</p>
              <p className="mt-1 font-mono text-xs font-medium text-[#fafafa]">
                {health ? formatPercent(health.error_rate) : '--'}
              </p>
            </div>
          </div>
        )}

        <div className="mb-3">
          {hasModels ? (
            <div className="flex flex-wrap gap-1">
              {provider.models.slice(0, 4).map((model) => (
                <span key={model} className="text-[11px] text-[#525252]">{model}</span>
              ))}
              {provider.models.length > 4 && (
                <span className="text-[11px] text-[#525252]">+{provider.models.length - 4} more</span>
              )}
            </div>
          ) : (
            <p className="text-[11px] text-[#525252]">No models available</p>
          )}
        </div>

        <Button
          variant="secondary"
          size="sm"
          className="w-full"
          onClick={() => onConfigure(provider, isConfigured)}
        >
          {isConfigured ? 'Configure' : 'Configure'}
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
        <div>
          <label className="block text-[11px] text-[#525252] mb-1">
            API Key {state.isEditing && '(leave blank to keep current)'}
          </label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={state.isEditing ? 'Enter new key to update...' : 'Enter API key...'}
              className="h-8 w-full rounded-md border border-white/[0.06] bg-transparent px-2.5 pr-8 text-[13px] text-[#fafafa] placeholder:text-[#333] font-mono focus:outline-none focus:border-white/[0.15] focus:ring-1 focus:ring-white/[0.10]"
            />
            <button
              type="button"
              onClick={() => setShowKey((prev) => !prev)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#333] hover:text-[#a3a3a3]"
            >
              {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        <Input
          label="Base URL (optional)"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder={state.provider.base_url || 'https://api.provider.com/v1'}
        />

        <div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-transparent px-3 py-2.5">
          <div>
            <p className="text-xs text-[#fafafa]">Enable Provider</p>
            <p className="text-[11px] text-[#525252] mt-0.5">
              Route requests to this provider when enabled
            </p>
          </div>
          <ToggleSwitch checked={enabled} onChange={setEnabled} />
        </div>

        {error && (
          <ErrorBanner onDismiss={() => setError(null)}>{error}</ErrorBanner>
        )}
      </div>

      {state.isEditing && !showDeleteConfirm && (
        <div className="mt-4 pt-4 border-t border-white/[0.06]">
          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isDeleting}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove Configuration
          </Button>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="mt-4 pt-4 border-t border-white/[0.06]">
          <div className="rounded-md border border-red-500/20 bg-red-500/[0.05] p-3">
            <p className="text-xs text-[#ef4444] font-medium mb-2">
              Are you sure you want to remove this configuration?
            </p>
            <p className="text-[11px] text-[#525252] mb-3">
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
        <Button variant="ghost" onClick={handleClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Saving...
            </>
          ) : (
            'Save'
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
    const configured = providers.filter((p) => p.status !== 'down' || p.enabled)
    const unconfigured = providers.filter((p) => p.status === 'down' && !p.enabled)
    return [...configured, ...unconfigured]
  }, [providers])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[13px] font-semibold text-[#fafafa]">Providers</h1>
        <div className="flex items-center gap-2 text-[11px] text-[#525252]">
          <Activity className="h-3 w-3" />
          Auto-refreshes every 30s
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={`skel-${i}`} />
          ))}
        </div>
      ) : sortedProviders.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {sortedProviders.map((provider) => (
            <ProviderCard key={provider.id} provider={provider} onConfigure={handleConfigure} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No providers available"
          description="No AI providers are registered in the gateway."
          icon={<Wifi className="h-5 w-5" />}
        />
      )}

      <ConfigureProviderDialog state={dialogState} onClose={handleCloseDialog} />
    </div>
  )
}
