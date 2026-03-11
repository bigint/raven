import { DataTable } from '@/components/shared/data-table'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogClose, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select } from '@/components/ui/select'
import { apiClient } from '@/lib/api'
import type { RequestLog } from '@/lib/types'
import { formatCurrency, formatLatency } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useState } from 'react'

export default function RequestsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('timestamp')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [statusFilter, setStatusFilter] = useState('')
  const [providerFilter, setProviderFilter] = useState('')
  const [selected, setSelected] = useState<RequestLog | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['logs', page, search, sortBy, sortOrder, statusFilter, providerFilter],
    queryFn: () =>
      apiClient.listLogs({
        page,
        per_page: 20,
        search,
        sort_by: sortBy,
        sort_order: sortOrder,
        status: statusFilter ? Number(statusFilter) : undefined,
        provider: providerFilter || undefined,
      }),
  })

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(key)
      setSortOrder('desc')
    }
  }

  const columns = [
    {
      key: 'timestamp',
      header: 'Time',
      sortable: true,
      render: (item: RequestLog) => (
        <span className="text-xs text-text-dark-secondary">
          {format(new Date(item.timestamp), 'MMM d, HH:mm:ss')}
        </span>
      ),
    },
    {
      key: 'provider',
      header: 'Provider',
      sortable: true,
      render: (item: RequestLog) => <span className="text-sm font-medium">{item.provider}</span>,
    },
    {
      key: 'model',
      header: 'Model',
      sortable: true,
      render: (item: RequestLog) => <span className="text-sm text-text-dark">{item.model}</span>,
    },
    {
      key: 'status_code',
      header: 'Status',
      sortable: true,
      render: (item: RequestLog) => (
        <Badge variant={item.status_code < 400 ? 'success' : 'error'}>{item.status_code}</Badge>
      ),
    },
    {
      key: 'latency_ms',
      header: 'Latency',
      sortable: true,
      render: (item: RequestLog) => (
        <span className="text-sm">{formatLatency(item.latency_ms)}</span>
      ),
    },
    {
      key: 'total_tokens',
      header: 'Tokens',
      sortable: true,
      render: (item: RequestLog) => (
        <span className="text-sm text-text-dark-secondary">
          {item.total_tokens.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'cost',
      header: 'Cost',
      sortable: true,
      render: (item: RequestLog) => <span className="text-sm">{formatCurrency(item.cost)}</span>,
    },
    {
      key: 'cache_hit',
      header: 'Cache',
      render: (item: RequestLog) => (
        <Badge variant={item.cache_hit ? 'success' : 'default'}>
          {item.cache_hit ? 'HIT' : 'MISS'}
        </Badge>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-text-dark">Requests</h1>
        <p className="text-sm text-text-dark-secondary mt-1">Browse and filter request logs</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select
          options={[
            { value: '', label: 'All statuses' },
            { value: '200', label: '200 OK' },
            { value: '400', label: '400 Bad Request' },
            { value: '429', label: '429 Rate Limited' },
            { value: '500', label: '500 Server Error' },
          ]}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        />
        <Select
          options={[
            { value: '', label: 'All providers' },
            { value: 'openai', label: 'OpenAI' },
            { value: 'anthropic', label: 'Anthropic' },
            { value: 'google', label: 'Google' },
          ]}
          value={providerFilter}
          onChange={(e) => setProviderFilter(e.target.value)}
        />
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
            onSort={handleSort}
            sortBy={sortBy}
            sortOrder={sortOrder}
            isLoading={isLoading}
            searchPlaceholder="Search by model, provider..."
            emptyTitle="No requests found"
            emptyDescription="Requests will appear here once the gateway starts processing traffic."
            onRowClick={setSelected}
            getRowKey={(item) => item.id}
          />
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!selected} onClose={() => setSelected(null)}>
        <DialogClose onClose={() => setSelected(null)} />
        <DialogHeader>
          <DialogTitle>Request Details</DialogTitle>
        </DialogHeader>
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-text-dark-secondary text-xs">Request ID</p>
                <p className="font-mono text-xs mt-1">{selected.id}</p>
              </div>
              <div>
                <p className="text-text-dark-secondary text-xs">Timestamp</p>
                <p className="mt-1">{format(new Date(selected.timestamp), 'PPpp')}</p>
              </div>
              <div>
                <p className="text-text-dark-secondary text-xs">Provider</p>
                <p className="mt-1 font-medium">{selected.provider}</p>
              </div>
              <div>
                <p className="text-text-dark-secondary text-xs">Model</p>
                <p className="mt-1">{selected.model}</p>
              </div>
              <div>
                <p className="text-text-dark-secondary text-xs">Status</p>
                <Badge variant={selected.status_code < 400 ? 'success' : 'error'} className="mt-1">
                  {selected.status_code}
                </Badge>
              </div>
              <div>
                <p className="text-text-dark-secondary text-xs">Latency</p>
                <p className="mt-1">{formatLatency(selected.latency_ms)}</p>
              </div>
              <div>
                <p className="text-text-dark-secondary text-xs">Input Tokens</p>
                <p className="mt-1">{selected.input_tokens.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-text-dark-secondary text-xs">Output Tokens</p>
                <p className="mt-1">{selected.output_tokens.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-text-dark-secondary text-xs">Cost</p>
                <p className="mt-1">{formatCurrency(selected.cost)}</p>
              </div>
              <div>
                <p className="text-text-dark-secondary text-xs">Cache</p>
                <Badge variant={selected.cache_hit ? 'success' : 'default'} className="mt-1">
                  {selected.cache_hit ? 'HIT' : 'MISS'}
                </Badge>
              </div>
            </div>
            {selected.error && (
              <div>
                <p className="text-text-dark-secondary text-xs mb-1">Error</p>
                <pre className="rounded-lg bg-bg-dark-tertiary p-3 text-xs text-error overflow-x-auto">
                  {selected.error}
                </pre>
              </div>
            )}
          </div>
        )}
      </Dialog>
    </div>
  )
}
