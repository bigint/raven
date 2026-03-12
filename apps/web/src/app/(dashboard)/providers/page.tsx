'use client'

import { api } from '@/lib/api'
import { Check, Eye, EyeOff, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'

interface Provider {
  id: string
  provider: string
  apiKeyMasked: string
  isEnabled: boolean
  createdAt: string
  updatedAt: string
}

const PROVIDER_OPTIONS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'google', label: 'Google' },
  { value: 'azure', label: 'Azure' },
  { value: 'cohere', label: 'Cohere' },
  { value: 'mistral', label: 'Mistral' },
]

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  azure: 'Azure',
  cohere: 'Cohere',
  mistral: 'Mistral',
}

type ModalMode = 'add' | 'edit' | null

interface FormState {
  provider: string
  apiKey: string
  isEnabled: boolean
}

const DEFAULT_FORM: FormState = {
  provider: 'openai',
  apiKey: '',
  isEnabled: true,
}

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [showApiKey, setShowApiKey] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchProviders = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.get<Provider[]>('/v1/providers')
      setProviders(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load providers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProviders()
  }, [])

  const openAdd = () => {
    setForm(DEFAULT_FORM)
    setShowApiKey(false)
    setFormError(null)
    setEditingId(null)
    setModalMode('add')
  }

  const openEdit = (provider: Provider) => {
    setForm({ provider: provider.provider, apiKey: '', isEnabled: provider.isEnabled })
    setShowApiKey(false)
    setFormError(null)
    setEditingId(provider.id)
    setModalMode('edit')
  }

  const closeModal = () => {
    setModalMode(null)
    setEditingId(null)
    setFormError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (modalMode === 'add' && !form.apiKey.trim()) {
      setFormError('API key is required')
      return
    }

    try {
      setSubmitting(true)

      if (modalMode === 'add') {
        await api.post<Provider>('/v1/providers', {
          provider: form.provider,
          apiKey: form.apiKey.trim(),
          isEnabled: form.isEnabled,
        })
      } else if (modalMode === 'edit' && editingId) {
        const body: { apiKey?: string; isEnabled?: boolean } = {
          isEnabled: form.isEnabled,
        }
        if (form.apiKey.trim()) {
          body.apiKey = form.apiKey.trim()
        }
        await api.put<Provider>(`/v1/providers/${editingId}`, body)
      }

      await fetchProviders()
      closeModal()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleEnabled = async (provider: Provider) => {
    try {
      await api.put<Provider>(`/v1/providers/${provider.id}`, {
        isEnabled: !provider.isEnabled,
      })
      setProviders((prev) =>
        prev.map((p) => (p.id === provider.id ? { ...p, isEnabled: !p.isEnabled } : p)),
      )
    } catch {
      // Silently revert — state wasn't changed
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      setDeleting(true)
      await api.delete(`/v1/providers/${deleteId}`)
      setProviders((prev) => prev.filter((p) => p.id !== deleteId))
      setDeleteId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete provider')
      setDeleteId(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Providers</h1>
          <p className="mt-1 text-sm text-muted-foreground">Configure your AI provider API keys.</p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Plus className="size-4" />
          Add Provider
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-border p-12 text-center">
          <div className="mx-auto size-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          <p className="mt-3 text-sm text-muted-foreground">Loading providers...</p>
        </div>
      ) : providers.length === 0 ? (
        <div className="rounded-xl border border-border p-12 text-center">
          <p className="text-muted-foreground">No providers configured yet.</p>
          <button
            type="button"
            onClick={openAdd}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Plus className="size-4" />
            Add your first provider
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Provider
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  API Key
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Status
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {providers.map((provider, idx) => (
                <tr
                  key={provider.id}
                  className={`transition-colors hover:bg-muted/30 ${idx !== providers.length - 1 ? 'border-b border-border' : ''}`}
                >
                  <td className="px-5 py-4 font-medium">
                    {PROVIDER_LABELS[provider.provider] ?? provider.provider}
                  </td>
                  <td className="px-5 py-4 font-mono text-muted-foreground">
                    {provider.apiKeyMasked}
                  </td>
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => handleToggleEnabled(provider)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                        provider.isEnabled
                          ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {provider.isEnabled ? (
                        <>
                          <Check className="size-3" />
                          Enabled
                        </>
                      ) : (
                        <>
                          <X className="size-3" />
                          Disabled
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(provider)}
                        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                        title="Edit provider"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteId(provider.id)}
                        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        title="Delete provider"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalMode !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-background shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-base font-semibold">
                {modalMode === 'add' ? 'Add Provider' : 'Edit Provider'}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
              {formError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {formError}
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="provider-select" className="text-sm font-medium">
                  Provider
                </label>
                <select
                  id="provider-select"
                  value={form.provider}
                  onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))}
                  disabled={modalMode === 'edit'}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {PROVIDER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="api-key-input" className="text-sm font-medium">
                  API Key{modalMode === 'edit' && ' (leave blank to keep existing)'}
                </label>
                <div className="relative">
                  <input
                    id="api-key-input"
                    type={showApiKey ? 'text' : 'password'}
                    value={form.apiKey}
                    onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))}
                    placeholder={modalMode === 'edit' ? '••••••••' : 'sk-...'}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 pr-10 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showApiKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.isEnabled}
                  onClick={() => setForm((f) => ({ ...f, isEnabled: !f.isEnabled }))}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                    form.isEnabled ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block size-4 rounded-full bg-white shadow-sm transition-transform ${
                      form.isEnabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
                <span className="text-sm">Enable this provider</span>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {submitting
                    ? modalMode === 'add'
                      ? 'Adding...'
                      : 'Saving...'
                    : modalMode === 'add'
                      ? 'Add Provider'
                      : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-background shadow-xl">
            <div className="px-6 py-5">
              <h2 className="text-base font-semibold">Delete Provider</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Are you sure you want to delete this provider? This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                disabled={deleting}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
