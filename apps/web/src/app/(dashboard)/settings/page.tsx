'use client'

import { api } from '@/lib/api'
import { AlertTriangle, Building2, CreditCard, Settings, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

interface OrgSettings {
  name: string
  slug: string
  plan: string
  subscriptionStatus: string
  userRole: string
}

const SLUG_PATTERN = /^[a-z][a-z0-9-]{1,48}[a-z0-9]$/

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-green-500/10 text-green-600',
  trialing: 'bg-blue-500/10 text-blue-600',
  past_due: 'bg-yellow-500/10 text-yellow-600',
  canceled: 'bg-muted text-muted-foreground',
  incomplete: 'bg-orange-500/10 text-orange-600',
}

export default function SettingsPage() {
  const router = useRouter()

  const [settings, setSettings] = useState<OrgSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Edit fields
  const [editName, setEditName] = useState('')
  const [editSlug, setEditSlug] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  // Delete modal
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.get<OrgSettings>('/v1/settings')
      setSettings(data)
      setEditName(data.name)
      setEditSlug(data.slug)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load organization settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const isAdmin = settings?.userRole === 'owner' || settings?.userRole === 'admin'
  const isOwner = settings?.userRole === 'owner'

  const isSlugValid = SLUG_PATTERN.test(editSlug)
  const hasChanges = settings !== null && (editName !== settings.name || editSlug !== settings.slug)

  const handleSave = async () => {
    if (!hasChanges || !isSlugValid) return
    try {
      setSaving(true)
      setSaveMessage(null)
      const data = await api.put<OrgSettings>('/v1/settings', {
        name: editName.trim(),
        slug: editSlug.trim(),
      })
      setSettings(data)
      setSaveMessage({ type: 'success', text: 'Organization settings saved.' })
    } catch (err) {
      setSaveMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save settings',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (deleteConfirmText !== settings?.name) return
    try {
      setDeleting(true)
      setDeleteError(null)
      await api.delete('/v1/settings')
      router.push('/profile')
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete organization')
      setDeleting(false)
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Organization Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your organization&apos;s configuration.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-border p-12 text-center">
          <Settings className="mx-auto size-6 animate-spin text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">Loading settings...</p>
        </div>
      ) : settings !== null ? (
        <div className="space-y-6">
          {/* General Section */}
          <div className="rounded-xl border border-border">
            <div className="flex items-center gap-3 border-b border-border px-6 py-4">
              <div className="rounded-lg bg-primary/10 p-2">
                <Building2 className="size-4 text-primary" />
              </div>
              <div>
                <h2 className="text-sm font-semibold">General</h2>
                <p className="text-xs text-muted-foreground">Organization name and slug</p>
              </div>
            </div>
            <div className="space-y-4 px-6 py-5">
              {saveMessage && (
                <div
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    saveMessage.type === 'success'
                      ? 'border-green-500/30 bg-green-500/10 text-green-600'
                      : 'border-destructive/30 bg-destructive/10 text-destructive'
                  }`}
                >
                  {saveMessage.text}
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="org-name" className="text-sm font-medium text-muted-foreground">
                    Organization Name
                  </label>
                  {isAdmin ? (
                    <input
                      id="org-name"
                      type="text"
                      value={editName}
                      onChange={(e) => {
                        setEditName(e.target.value)
                        setSaveMessage(null)
                      }}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  ) : (
                    <div className="rounded-lg border border-input bg-muted/50 px-3 py-2 text-sm">
                      {settings.name}
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="org-slug" className="text-sm font-medium text-muted-foreground">
                    Slug
                  </label>
                  {isAdmin ? (
                    <>
                      <input
                        id="org-slug"
                        type="text"
                        value={editSlug}
                        onChange={(e) => {
                          setEditSlug(e.target.value.toLowerCase())
                          setSaveMessage(null)
                        }}
                        className={`w-full rounded-lg border bg-background px-3 py-2 font-mono text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring ${
                          editSlug && !isSlugValid ? 'border-destructive' : 'border-input'
                        }`}
                      />
                      <p className="text-xs text-muted-foreground">
                        Lowercase letters, numbers, and hyphens. 3-50 characters.
                      </p>
                    </>
                  ) : (
                    <div className="rounded-lg border border-input bg-muted/50 px-3 py-2 font-mono text-sm">
                      {settings.slug}
                    </div>
                  )}
                </div>
              </div>
              {isAdmin && (
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || !hasChanges || !isSlugValid}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Plan & Subscription Section */}
          <div className="rounded-xl border border-border">
            <div className="flex items-center gap-3 border-b border-border px-6 py-4">
              <div className="rounded-lg bg-primary/10 p-2">
                <CreditCard className="size-4 text-primary" />
              </div>
              <div>
                <h2 className="text-sm font-semibold">Plan & Subscription</h2>
                <p className="text-xs text-muted-foreground">
                  Your current plan and billing status
                </p>
              </div>
            </div>
            <div className="px-6 py-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="space-y-1">
                    <span className="text-sm font-medium text-muted-foreground">Current Plan</span>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-semibold capitalize">{settings.plan}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm font-medium text-muted-foreground">Status</span>
                    <div>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${STATUS_BADGE[settings.subscriptionStatus ?? 'active'] ?? 'bg-muted text-muted-foreground'}`}
                      >
                        {(settings.subscriptionStatus ?? 'active').replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => router.push('/billing')}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
                >
                  Manage Billing
                </button>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          {isOwner && (
            <div className="rounded-xl border border-destructive/30">
              <div className="flex items-center gap-3 border-b border-destructive/30 px-6 py-4">
                <div className="rounded-lg bg-destructive/10 p-2">
                  <AlertTriangle className="size-4 text-destructive" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-destructive">Danger Zone</h2>
                  <p className="text-xs text-muted-foreground">
                    Irreversible and destructive actions
                  </p>
                </div>
              </div>
              <div className="px-6 py-5">
                <div className="flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-4">
                  <div>
                    <p className="text-sm font-medium">Delete Organization</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Permanently delete your organization and all associated data. This cannot be
                      undone.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteConfirmText('')
                      setDeleteError(null)
                      setShowDeleteConfirm(true)
                    }}
                    className="ml-4 shrink-0 rounded-lg border border-destructive px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground"
                  >
                    Delete Organization
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowDeleteConfirm(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setShowDeleteConfirm(false)
          }}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-border bg-background shadow-xl"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5">
              <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-destructive/10">
                <Trash2 className="size-5 text-destructive" />
              </div>
              <h2 className="text-base font-semibold">Delete Organization</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                This will permanently delete{' '}
                <span className="font-medium text-foreground">
                  {settings?.name ?? 'your organization'}
                </span>{' '}
                and all associated data including providers, keys, budgets, and request logs.
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                Type <span className="font-mono font-medium text-foreground">{settings?.name}</span>{' '}
                to confirm.
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => {
                  setDeleteConfirmText(e.target.value)
                  setDeleteError(null)
                }}
                placeholder={settings?.name ?? ''}
                className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {deleteError && (
                <div className="mt-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {deleteError}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setShowDeleteConfirm(false)
                }}
                disabled={deleting}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting || deleteConfirmText !== settings?.name}
                className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete Organization'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
