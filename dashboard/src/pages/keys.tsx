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
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { Check, Copy, MoreVertical, Plus, Trash2 } from 'lucide-react'
import { useCallback, useState } from 'react'

const GATEWAY_URL =
  import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '')

type CodeTab = 'curl' | 'python' | 'typescript'

const CopyButton = ({ text }: { readonly text: string }) => {
  const [copied, setCopied] = useState(false)
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [text])
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="absolute top-2 right-2 rounded-md border border-border bg-surface p-1 text-text-muted hover:text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity"
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
    </button>
  )
}

function getCodeExample(tab: CodeTab, key: string): string {
  const gatewayUrl = GATEWAY_URL || 'http://localhost:8080'
  switch (tab) {
    case 'curl':
      return `curl ${gatewayUrl}/v1/chat/completions \\
  -H "Authorization: Bearer ${key}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`
    case 'python':
      return `from openai import OpenAI

client = OpenAI(
    api_key="${key}",
    base_url="${gatewayUrl}/v1"
)

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello!"}]
)
print(response.choices[0].message.content)`
    case 'typescript':
      return `import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: '${key}',
  baseURL: '${gatewayUrl}/v1'
})

const response = await client.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello!' }]
})
console.log(response.choices[0].message.content)`
  }
}

function relativeTime(dateStr: string | undefined): string {
  if (!dateStr) return 'Never'
  try {
    return `${formatDistanceToNow(new Date(dateStr), { addSuffix: false })} ago`
  } catch {
    return '--'
  }
}

const CreatedKeyDialog = ({
  keyValue,
  onClose,
}: {
  readonly keyValue: string | null
  readonly onClose: () => void
}) => {
  const [codeTab, setCodeTab] = useState<CodeTab>('curl')

  if (!keyValue) return null

  const tabs: { id: CodeTab; label: string }[] = [
    { id: 'curl', label: 'cURL' },
    { id: 'python', label: 'Python' },
    { id: 'typescript', label: 'TypeScript' },
  ]

  return (
    <Dialog open={!!keyValue} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>Key Created</DialogTitle>
        <DialogDescription>
          This is the only time you'll see this key. Copy it now.
        </DialogDescription>
      </DialogHeader>

      <div className="flex items-center gap-2 mt-2">
        <code className="flex-1 rounded-md border border-border bg-surface px-3 py-2 font-mono text-[11px] text-text-primary break-all">
          {keyValue}
        </code>
        <Button
          variant="secondary"
          size="icon"
          onClick={() => navigator.clipboard.writeText(keyValue)}
        >
          <Copy className="size-3.5" />
        </Button>
      </div>

      <div className="mt-2">
        <Badge variant="warning">Store this key securely</Badge>
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <p className="text-[9px] font-medium text-text-muted uppercase tracking-[1px] mb-3">
          Usage
        </p>
        <div className="flex gap-px mb-3 border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCodeTab(tab.id)}
              className={cn(
                'px-3 py-1.5 text-[11px] font-medium border-b-2 -mb-px transition-colors',
                codeTab === tab.id
                  ? 'border-accent text-text-primary'
                  : 'border-transparent text-text-muted hover:text-text-secondary',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative group">
          <CopyButton text={getCodeExample(codeTab, keyValue)} />
          <pre className="rounded-md border border-border bg-bg p-3 overflow-x-auto">
            <code className="text-[11px] leading-relaxed font-mono text-text-secondary">
              {getCodeExample(codeTab, keyValue)}
            </code>
          </pre>
        </div>
      </div>
    </Dialog>
  )
}

const KeysPage = () => {
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
            <button type="button" className="rounded-md p-1 hover:bg-surface-hover">
              <MoreVertical className="size-3.5 text-text-tertiary" />
            </button>
          }
        >
          <DropdownItem danger onClick={() => deleteKey.mutate(item.id)}>
            <Trash2 className="size-3.5" />
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
          <Plus className="size-3.5" />
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

      <CreatedKeyDialog keyValue={createdKey} onClose={() => setCreatedKey(null)} />
    </div>
  )
}

export default KeysPage
