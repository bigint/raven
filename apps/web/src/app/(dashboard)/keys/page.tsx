'use client'

import { AlertTriangle, Check, Copy, Key, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Select } from '@/components/select'
import { useEventStream } from '@/hooks/use-event-stream'
import { api } from '@/lib/api'

interface VirtualKey {
  id: string
  name: string
  keyPrefix: string
  environment: 'live' | 'test'
  rateLimitRpm: number | null
  rateLimitRpd: number | null
  isActive: boolean
  expiresAt: string | null
  createdAt: string
  lastUsedAt: string | null
}

interface CreateKeyResponse extends VirtualKey {
  key: string
}

type ModalMode = 'create' | 'edit' | null

interface FormState {
  name: string
  environment: 'live' | 'test'
  rateLimitRpm: string
  rateLimitRpd: string
  isActive: boolean
}

const DEFAULT_FORM: FormState = {
  name: '',
  environment: 'live',
  rateLimitRpm: '',
  rateLimitRpd: '',
  isActive: true,
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function KeysPage() {
  const [keys, setKeys] = useState<VirtualKey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [editingKey, setEditingKey] = useState<VirtualKey | null>(null)
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [newKeyValue, setNewKeyValue] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState(false)

  const fetchKeys = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.get<VirtualKey[]>('/v1/keys')
      setKeys(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load keys')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchKeys()
  }, [fetchKeys])

  useEventStream({
    events: ['key.created', 'key.updated', 'key.deleted'],
    onEvent: () => fetchKeys(),
    enabled: !loading,
  })

  const openCreate = () => {
    setForm(DEFAULT_FORM)
    setFormError(null)
    setEditingKey(null)
    setModalMode('create')
  }

  const openEdit = (key: VirtualKey) => {
    setForm({
      name: key.name,
      environment: key.environment,
      rateLimitRpm: key.rateLimitRpm !== null ? String(key.rateLimitRpm) : '',
      rateLimitRpd: key.rateLimitRpd !== null ? String(key.rateLimitRpd) : '',
      isActive: key.isActive,
    })
    setFormError(null)
    setEditingKey(key)
    setModalMode('edit')
  }

  const closeModal = () => {
    setModalMode(null)
    setEditingKey(null)
    setFormError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!form.name.trim()) {
      setFormError('Name is required')
      return
    }

    try {
      setSubmitting(true)

      if (modalMode === 'create') {
        const body: {
          name: string
          environment: 'live' | 'test'
          rateLimitRpm?: number
          rateLimitRpd?: number
        } = {
          name: form.name.trim(),
          environment: form.environment,
        }
        if (form.rateLimitRpm.trim()) {
          body.rateLimitRpm = Number(form.rateLimitRpm)
        }
        if (form.rateLimitRpd.trim()) {
          body.rateLimitRpd = Number(form.rateLimitRpd)
        }
        const created = await api.post<CreateKeyResponse>('/v1/keys', body)
        setNewKeyValue(created.key)
        await fetchKeys()
        closeModal()
      } else if (modalMode === 'edit' && editingKey) {
        const body: {
          name?: string
          rateLimitRpm?: number | null
          rateLimitRpd?: number | null
          isActive?: boolean
        } = {
          name: form.name.trim(),
          isActive: form.isActive,
          rateLimitRpm: form.rateLimitRpm.trim() ? Number(form.rateLimitRpm) : null,
          rateLimitRpd: form.rateLimitRpd.trim() ? Number(form.rateLimitRpd) : null,
        }
        await api.put<VirtualKey>(`/v1/keys/${editingKey.id}`, body)
        await fetchKeys()
        closeModal()
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      setDeleting(true)
      await api.delete(`/v1/keys/${deleteId}`)
      setKeys((prev) => prev.filter((k) => k.id !== deleteId))
      setDeleteId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete key')
      setDeleteId(null)
    } finally {
      setDeleting(false)
    }
  }

  const handleCopyNewKey = async () => {
    if (!newKeyValue) return
    await navigator.clipboard.writeText(newKeyValue)
    setCopiedKey(true)
    toast.success('Key copied to clipboard')
    setTimeout(() => setCopiedKey(false), 2000)
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Virtual Keys</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage API keys for accessing the Raven gateway.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Plus className="size-4" />
          Create Key
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
          <p className="mt-3 text-sm text-muted-foreground">Loading keys...</p>
        </div>
      ) : keys.length === 0 ? (
        <div className="rounded-xl border border-border p-12 text-center">
          <Key className="mx-auto mb-3 size-8 text-muted-foreground/50" />
          <p className="text-muted-foreground">No keys created yet.</p>
          <button
            type="button"
            onClick={openCreate}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Plus className="size-4" />
            Create your first key
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Name
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Environment
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Rate Limits
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Status
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Last Used
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {keys.map((key, idx) => (
                <tr
                  key={key.id}
                  className={`transition-colors hover:bg-muted/30 ${idx !== keys.length - 1 ? 'border-b border-border' : ''}`}
                >
                  <td className="px-5 py-4 font-medium">{key.name}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                        key.environment === 'live'
                          ? 'bg-green-500/10 text-green-600'
                          : 'bg-yellow-500/10 text-yellow-600'
                      }`}
                    >
                      {key.environment === 'live' ? 'Live' : 'Test'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {key.rateLimitRpm !== null || key.rateLimitRpd !== null ? (
                      <div className="flex flex-col gap-0.5 text-xs">
                        {key.rateLimitRpm !== null && (
                          <span>{Number(key.rateLimitRpm).toLocaleString()} / min</span>
                        )}
                        {key.rateLimitRpd !== null && (
                          <span>{Number(key.rateLimitRpd).toLocaleString()} / day</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                        key.isActive
                          ? 'bg-green-500/10 text-green-600'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {key.isActive ? (
                        <>
                          <Check className="size-3" />
                          Active
                        </>
                      ) : (
                        <>
                          <X className="size-3" />
                          Inactive
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-muted-foreground">
                    {formatDate(key.lastUsedAt)}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(key)}
                        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                        title="Edit key"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteId(key.id)}
                        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        title="Delete key"
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

      {/* Create / Edit Modal */}
      {modalMode !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeModal}
          onKeyDown={(e) => {
            if (e.key === 'Escape') closeModal()
          }}
        >
          <div
            className="w-full max-w-md rounded-xl border border-border bg-background shadow-xl"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-base font-semibold">
                {modalMode === 'create' ? 'Create Key' : 'Edit Key'}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') closeModal()
                }}
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
                <label htmlFor="key-name" className="text-sm font-medium">
                  Name
                </label>
                <input
                  id="key-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="My API Key"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {modalMode === 'create' && (
                <div className="space-y-1.5">
                  <label htmlFor="key-environment" className="text-sm font-medium">
                    Environment
                  </label>
                  <Select
                    id="key-environment"
                    value={form.environment}
                    onChange={(v) => setForm((f) => ({ ...f, environment: v as 'live' | 'test' }))}
                    options={[
                      { value: 'live', label: 'Live' },
                      { value: 'test', label: 'Test' },
                    ]}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="key-rpm" className="text-sm font-medium">
                    Rate Limit (RPM)
                  </label>
                  <input
                    id="key-rpm"
                    type="number"
                    min="1"
                    value={form.rateLimitRpm}
                    onChange={(e) => setForm((f) => ({ ...f, rateLimitRpm: e.target.value }))}
                    placeholder="No limit"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="key-rpd" className="text-sm font-medium">
                    Rate Limit (RPD)
                  </label>
                  <input
                    id="key-rpd"
                    type="number"
                    min="1"
                    value={form.rateLimitRpd}
                    onChange={(e) => setForm((f) => ({ ...f, rateLimitRpd: e.target.value }))}
                    placeholder="No limit"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              {modalMode === 'edit' && (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={form.isActive}
                    onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                      form.isActive ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block size-4 rounded-full bg-white shadow-sm transition-transform ${
                        form.isActive ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <span className="text-sm">Active</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeModal}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') closeModal()
                  }}
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
                    ? modalMode === 'create'
                      ? 'Creating...'
                      : 'Saving...'
                    : modalMode === 'create'
                      ? 'Create Key'
                      : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Key Reveal Dialog */}
      {newKeyValue !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setNewKeyValue(null)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setNewKeyValue(null)
          }}
        >
          <div
            className="w-full max-w-md rounded-xl border border-border bg-background shadow-xl"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-base font-semibold">Key Created</h2>
              <button
                type="button"
                onClick={() => setNewKeyValue(null)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setNewKeyValue(null)
                }}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="flex items-start gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-yellow-600" />
                <p className="text-sm text-yellow-700">
                  This key won't be shown again. Copy it now and store it somewhere safe.
                </p>
              </div>

              <div className="space-y-1.5">
                <span className="text-sm font-medium">Your API Key</span>
                <div className="flex items-center gap-2 rounded-lg border border-input bg-muted/50 px-3 py-2">
                  <span className="flex-1 truncate font-mono text-sm">{newKeyValue}</span>
                  <button
                    type="button"
                    onClick={handleCopyNewKey}
                    className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    title="Copy key"
                  >
                    {copiedKey ? (
                      <Check className="size-4 text-green-600" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end border-t border-border px-6 py-4">
              <button
                type="button"
                onClick={() => setNewKeyValue(null)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setNewKeyValue(null)
                }}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setDeleteId(null)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setDeleteId(null)
          }}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-border bg-background shadow-xl"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5">
              <h2 className="text-base font-semibold">Delete Key</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Are you sure you want to delete this key? Any applications using it will lose
                access. This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setDeleteId(null)
                }}
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
