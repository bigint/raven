import { DataTable } from '@/components/shared/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DropdownItem, DropdownMenu } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { useCreateKey, useDeleteKey, useKeys } from '@/hooks/use-keys'
import type { VirtualKey } from '@/lib/types'
import { formatDistanceToNow } from 'date-fns'
import { Copy, MoreVertical, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

function relativeTime(dateStr: string | undefined): string {
  if (!dateStr) return 'Never'
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: false }) + ' ago'
  } catch {
    return '--'
  }
}

export default function KeysPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [createdKey, setCreatedKey] = useState<string | null>(null)

  const { data, isLoading } = useKeys({ page, per_page: 20, search })
  const createKey = useCreateKey()
  const deleteKey = useDeleteKey()

  const handleCreate = async () => {
    if (!newKeyName.trim()) return
    const result = await createKey.mutateAsync({ name: newKeyName })
    if (result.plain_key) {
      setCreatedKey(result.plain_key)
    }
    setNewKeyName('')
    setCreateOpen(false)
  }

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key)
  }

  const columns = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (item: VirtualKey) => (
        <span className="text-xs font-medium text-text-primary">{item.name}</span>
      ),
    },
    {
      key: 'key_prefix',
      header: 'Key',
      render: (item: VirtualKey) => (
        <span className="font-mono text-[11px] text-text-tertiary">{item.key_prefix}...</span>
      ),
    },
    {
      key: 'budget_limit',
      header: 'Budget',
      render: (item: VirtualKey) => (
        <span className="font-mono text-xs text-text-secondary">
          {item.budget_limit ? `$${item.budget_limit}` : 'unlimited'}
        </span>
      ),
    },
    {
      key: 'rate_limit',
      header: 'Rate Limit',
      render: (item: VirtualKey) => (
        <span className="font-mono text-xs text-text-secondary">
          {item.rate_limit ? `${item.rate_limit}/${item.rate_limit_window}` : 'unlimited'}
        </span>
      ),
    },
    {
      key: 'last_used_at',
      header: 'Last Used',
      render: (item: VirtualKey) => (
        <span className="font-mono text-xs text-text-tertiary">
          {relativeTime(item.last_used_at)}
        </span>
      ),
    },
    {
      key: 'expires_at',
      header: 'Expires',
      render: (item: VirtualKey) => (
        <span className="font-mono text-xs text-text-tertiary">
          {item.expires_at ? relativeTime(item.expires_at) : 'never'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-10',
      render: (item: VirtualKey) => (
        <DropdownMenu
          trigger={
            <button
              type="button"
              className="rounded-md p-1 hover:bg-surface-hover"
            >
              <MoreVertical className="h-3.5 w-3.5 text-text-tertiary" />
            </button>
          }
        >
          <DropdownItem danger onClick={() => deleteKey.mutate(item.id)}>
            <Trash2 className="h-3.5 w-3.5" />
            Delete Key
          </DropdownItem>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[13px] font-semibold text-text-primary">Keys</h1>
        <Button variant="primary" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          Create Key
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        total={data?.total ?? 0}
        page={page}
        perPage={20}
        onPageChange={setPage}
        onSearch={setSearch}
        isLoading={isLoading}
        searchPlaceholder="Search keys..."
        emptyTitle="No virtual keys"
        emptyDescription="Create your first virtual key to start using the gateway."
        getRowKey={(item) => item.id}
      />

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)}>
        <DialogHeader>
          <DialogTitle>Create Virtual Key</DialogTitle>
          <DialogDescription>Create a new API key for accessing the gateway.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            label="Key Name"
            placeholder="e.g., Production API Key"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setCreateOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleCreate} disabled={createKey.isPending}>
            {createKey.isPending ? 'Creating...' : 'Create Key'}
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={!!createdKey} onClose={() => setCreatedKey(null)}>
        <DialogHeader>
          <DialogTitle>Key Created</DialogTitle>
          <DialogDescription>
            This is the only time you'll see this key. Copy it now.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 mt-2">
          <code className="flex-1 rounded-md border border-border bg-surface px-3 py-2 font-mono text-[11px] text-text-primary break-all">
            {createdKey}
          </code>
          <Button
            variant="secondary"
            size="icon"
            onClick={() => createdKey && handleCopyKey(createdKey)}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="mt-3">
          <Badge variant="warning">Store this key securely</Badge>
        </div>
      </Dialog>
    </div>
  )
}
