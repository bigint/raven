import { DataTable } from '@/components/shared/data-table'
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
import { DropdownItem, DropdownMenu, DropdownSeparator } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { useCreateKey, useDeleteKey, useKeys, useRotateKey } from '@/hooks/use-keys'
import type { VirtualKey } from '@/lib/types'
import { format } from 'date-fns'
import { Copy, Key, MoreVertical, Plus, RotateCw, Trash2 } from 'lucide-react'
import { useState } from 'react'

export default function KeysPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [createdKey, setCreatedKey] = useState<string | null>(null)

  const { data, isLoading } = useKeys({ page, per_page: 20, search })
  const createKey = useCreateKey()
  const rotateKey = useRotateKey()
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
        <div className="flex items-center gap-2">
          <Key className="h-4 w-4 text-zinc-600" />
          <span className="font-medium text-zinc-100">{item.name}</span>
        </div>
      ),
    },
    {
      key: 'key_prefix',
      header: 'Key',
      render: (item: VirtualKey) => (
        <code className="text-xs font-mono bg-zinc-800/60 border border-zinc-700/60 px-2 py-1 rounded-md text-zinc-400">
          {item.key_prefix}...
        </code>
      ),
    },
    {
      key: 'budget_limit',
      header: 'Budget',
      render: (item: VirtualKey) => (
        <span className="text-sm text-zinc-300">
          {item.budget_limit ? `$${item.budget_limit}` : 'Unlimited'}
        </span>
      ),
    },
    {
      key: 'rate_limit',
      header: 'Rate Limit',
      render: (item: VirtualKey) => (
        <span className="text-sm text-zinc-300">
          {item.rate_limit ? `${item.rate_limit}/${item.rate_limit_window}` : 'None'}
        </span>
      ),
    },
    {
      key: 'last_used_at',
      header: 'Last Used',
      render: (item: VirtualKey) => (
        <span className="text-xs text-zinc-500">
          {item.last_used_at ? format(new Date(item.last_used_at), 'MMM d, HH:mm') : 'Never'}
        </span>
      ),
    },
    {
      key: 'expires_at',
      header: 'Expires',
      render: (item: VirtualKey) => (
        <span className="text-xs text-zinc-500">
          {item.expires_at ? format(new Date(item.expires_at), 'MMM d, yyyy') : 'Never'}
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
              className="rounded-lg p-1.5 hover:bg-zinc-800/60 transition-all duration-200"
            >
              <MoreVertical className="h-4 w-4 text-zinc-500" />
            </button>
          }
        >
          <DropdownItem onClick={() => rotateKey.mutate(item.id)}>
            <RotateCw className="h-3.5 w-3.5" />
            Rotate Key
          </DropdownItem>
          <DropdownSeparator />
          <DropdownItem danger onClick={() => deleteKey.mutate(item.id)}>
            <Trash2 className="h-3.5 w-3.5" />
            Delete Key
          </DropdownItem>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Virtual Keys</h1>
          <p className="text-sm text-zinc-500 mt-1">Manage API keys for accessing the gateway</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Create Key
        </Button>
      </div>

      <Card>
        <CardContent>
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
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)}>
        <DialogClose onClose={() => setCreateOpen(false)} />
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
          <Button variant="secondary" onClick={() => setCreateOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={createKey.isPending}>
            {createKey.isPending ? 'Creating...' : 'Create Key'}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Created key display */}
      <Dialog open={!!createdKey} onClose={() => setCreatedKey(null)}>
        <DialogClose onClose={() => setCreatedKey(null)} />
        <DialogHeader>
          <DialogTitle>Key Created</DialogTitle>
          <DialogDescription>
            Copy this key now. You will not be able to see it again.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 mt-2">
          <code className="flex-1 rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm font-mono text-zinc-200 break-all">
            {createdKey}
          </code>
          <Button
            variant="secondary"
            size="icon"
            onClick={() => createdKey && handleCopyKey(createdKey)}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-3">
          <Badge variant="warning">Store this key securely</Badge>
        </div>
      </Dialog>
    </div>
  )
}
