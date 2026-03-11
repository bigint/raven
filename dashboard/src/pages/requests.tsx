import { DataTable } from '@/components/shared/data-table'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { apiClient } from '@/lib/api'
import type { RequestLog } from '@/lib/types'
import { formatCurrency, formatLatency } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useState } from 'react'

function StatusCode({ code }: { code: number }) {
  const color =
    code < 300 ? 'text-[#22c55e]' : code < 500 ? 'text-[#f59e0b]' : 'text-[#ef4444]'
  return <span className={`font-mono text-xs font-medium ${color}`}>{code}</span>
}

function ExpandedRowDetail({ row }: { row: RequestLog }) {
  return (
    <div className="px-5 py-4">
      <div className="grid grid-cols-4 gap-x-8 gap-y-4">
        <div>
          <p className="text-[9px] font-medium text-[#333] uppercase tracking-[1px]">Request ID</p>
          <p className="mt-1 font-mono text-xs text-[#fafafa]">{row.id}</p>
        </div>
        <div>
          <p className="text-[9px] font-medium text-[#333] uppercase tracking-[1px]">Provider</p>
          <p className="mt-1 font-mono text-xs text-[#fafafa]">{row.provider}</p>
        </div>
        <div>
          <p className="text-[9px] font-medium text-[#333] uppercase tracking-[1px]">Model</p>
          <p className="mt-1 font-mono text-xs text-[#fafafa]">{row.model}</p>
        </div>
        <div>
          <p className="text-[9px] font-medium text-[#333] uppercase tracking-[1px]">Status</p>
          <div className="mt-1">
            <StatusCode code={row.status_code} />
          </div>
        </div>
        <div>
          <p className="text-[9px] font-medium text-[#333] uppercase tracking-[1px]">Timestamp</p>
          <p className="mt-1 font-mono text-xs text-[#fafafa]">
            {format(new Date(row.timestamp), 'yyyy-MM-dd')}{' '}
            {format(new Date(row.timestamp), 'HH:mm:ss.SSS')}
          </p>
        </div>
        <div>
          <p className="text-[9px] font-medium text-[#333] uppercase tracking-[1px]">Latency</p>
          <p className="mt-1 font-mono text-xs text-[#fafafa]">{formatLatency(row.latency_ms)}</p>
        </div>
        <div>
          <p className="text-[9px] font-medium text-[#333] uppercase tracking-[1px]">Tokens (In)</p>
          <p className="mt-1 font-mono text-xs text-[#fafafa]">{row.input_tokens.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-[9px] font-medium text-[#333] uppercase tracking-[1px]">Tokens (Out)</p>
          <p className="mt-1 font-mono text-xs text-[#fafafa]">{row.output_tokens.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-[9px] font-medium text-[#333] uppercase tracking-[1px]">Cost</p>
          <p className="mt-1 font-mono text-xs text-[#fafafa]">{formatCurrency(row.cost)}</p>
        </div>
        <div>
          <p className="text-[9px] font-medium text-[#333] uppercase tracking-[1px]">Cache</p>
          <p className="mt-1 font-mono text-xs text-[#fafafa]">{row.cache_hit ? 'hit' : 'miss'}</p>
        </div>
        <div>
          <p className="text-[9px] font-medium text-[#333] uppercase tracking-[1px]">Error</p>
          <p className="mt-1 font-mono text-xs text-[#fafafa]">{row.error ? '—' : '—'}</p>
        </div>
      </div>
      {row.error && (
        <pre className="mt-4 max-h-[160px] overflow-auto rounded-md border border-white/[0.06] bg-white/[0.02] p-3 font-mono text-[11px] text-[#525252]">
          {row.error}
        </pre>
      )}
    </div>
  )
}

export default function RequestsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('timestamp')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [statusFilter, setStatusFilter] = useState('')
  const [providerFilter, setProviderFilter] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

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

  const handleRowClick = (row: RequestLog) => {
    setExpandedId((prev) => (prev === row.id ? null : row.id))
  }

  const columns = [
    {
      key: 'timestamp',
      header: 'Timestamp',
      sortable: true,
      render: (item: RequestLog) => (
        <span className="font-mono text-xs text-[#525252]">
          {format(new Date(item.timestamp), 'HH:mm:ss.SSS')}
        </span>
      ),
    },
    {
      key: 'provider',
      header: 'Provider',
      sortable: true,
      render: (item: RequestLog) => (
        <span className="text-xs text-[#a3a3a3]">{item.provider}</span>
      ),
    },
    {
      key: 'model',
      header: 'Model',
      sortable: true,
      render: (item: RequestLog) => (
        <span className="text-xs text-[#a3a3a3]">{item.model}</span>
      ),
    },
    {
      key: 'status_code',
      header: 'Status',
      sortable: true,
      render: (item: RequestLog) => <StatusCode code={item.status_code} />,
    },
    {
      key: 'latency_ms',
      header: 'Latency',
      sortable: true,
      render: (item: RequestLog) => (
        <span className="font-mono text-xs font-medium text-[#fafafa]">
          {formatLatency(item.latency_ms)}
        </span>
      ),
    },
    {
      key: 'total_tokens',
      header: 'Tokens',
      sortable: true,
      render: (item: RequestLog) => (
        <span className="font-mono text-xs font-medium text-[#fafafa]">
          {item.total_tokens.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'cost',
      header: 'Cost',
      sortable: true,
      render: (item: RequestLog) => (
        <span className="font-mono text-xs font-medium text-[#fafafa]">
          {formatCurrency(item.cost)}
        </span>
      ),
    },
    {
      key: 'cache_hit',
      header: 'Cache',
      render: (item: RequestLog) =>
        item.cache_hit ? (
          <Badge variant="success">CACHED</Badge>
        ) : null,
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[13px] font-semibold text-[#fafafa]">Requests</h1>
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
      </div>

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
        onRowClick={handleRowClick}
        getRowKey={(item) => item.id}
        expandedRow={expandedId}
        renderExpandedRow={(row) => <ExpandedRowDetail row={row} />}
      />
    </div>
  )
}
