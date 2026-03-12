'use client'

import { useActiveOrganization, useSession } from '@/lib/auth-client'
import { AlertTriangle, Building2, User } from 'lucide-react'
import { useState } from 'react'

export default function SettingsPage() {
  const { data: session } = useSession()
  const { data: activeOrg } = useActiveOrganization()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your organization and account settings.
        </p>
      </div>

      <div className="space-y-6">
        {/* Organization Section */}
        <div className="rounded-xl border border-border">
          <div className="flex items-center gap-3 border-b border-border px-6 py-4">
            <div className="rounded-lg bg-primary/10 p-2">
              <Building2 className="size-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Organization</h2>
              <p className="text-xs text-muted-foreground">Your organization details</p>
            </div>
          </div>
          <div className="space-y-4 px-6 py-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">
                  Organization Name
                </label>
                <div className="rounded-lg border border-input bg-muted/50 px-3 py-2 text-sm">
                  {activeOrg?.name ?? '—'}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Organization ID</label>
                <div className="rounded-lg border border-input bg-muted/50 px-3 py-2 font-mono text-xs text-muted-foreground">
                  {activeOrg?.id ?? '—'}
                </div>
              </div>
            </div>
            {activeOrg?.slug && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Slug</label>
                <div className="rounded-lg border border-input bg-muted/50 px-3 py-2 font-mono text-sm">
                  {activeOrg.slug}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Account Section */}
        <div className="rounded-xl border border-border">
          <div className="flex items-center gap-3 border-b border-border px-6 py-4">
            <div className="rounded-lg bg-primary/10 p-2">
              <User className="size-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Account</h2>
              <p className="text-xs text-muted-foreground">Your personal account information</p>
            </div>
          </div>
          <div className="space-y-4 px-6 py-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Name</label>
                <div className="rounded-lg border border-input bg-muted/50 px-3 py-2 text-sm">
                  {session?.user?.name ?? '—'}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <div className="rounded-lg border border-input bg-muted/50 px-3 py-2 text-sm">
                  {session?.user?.email ?? '—'}
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">User ID</label>
              <div className="rounded-lg border border-input bg-muted/50 px-3 py-2 font-mono text-xs text-muted-foreground">
                {session?.user?.id ?? '—'}
              </div>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="rounded-xl border border-destructive/30">
          <div className="flex items-center gap-3 border-b border-destructive/30 px-6 py-4">
            <div className="rounded-lg bg-destructive/10 p-2">
              <AlertTriangle className="size-4 text-destructive" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-destructive">Danger Zone</h2>
              <p className="text-xs text-muted-foreground">Irreversible and destructive actions</p>
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
                onClick={() => setShowDeleteConfirm(true)}
                className="ml-4 shrink-0 rounded-lg border border-destructive px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground"
              >
                Delete Organization
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowDeleteConfirm(false)}>
          <div className="w-full max-w-sm rounded-xl border border-border bg-background shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5">
              <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="size-5 text-destructive" />
              </div>
              <h2 className="text-base font-semibold">Delete Organization</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                This will permanently delete{' '}
                <span className="font-medium text-foreground">
                  {activeOrg?.name ?? 'your organization'}
                </span>{' '}
                and all associated data including providers, keys, budgets, and request logs.
              </p>
              <p className="mt-2 text-sm font-medium text-destructive">
                This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  // TODO: implement org deletion API call
                  setShowDeleteConfirm(false)
                }}
                disabled
                className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                Delete Organization
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
