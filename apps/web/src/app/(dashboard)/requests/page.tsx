'use client'

import { api } from '@/lib/api'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'

interface RequestLog {
  id: string
  timestamp: string
  provider: string
  model: string
  statusCode: number
  latencyMs: number
  costUsd: number
  cacheHit: boolean
}

interface RequestsResponse {
  data: RequestLog[]
  total: number
  page: number
  pageSize: number
}

const PROVIDER_OPTIONS = [
  { value: '', label: 'All Providers' },
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

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: '2xx', label: '2xx Success' },
  { value: '4xx', label: '4xx Client Error' },
  { value: '5xx', label: '5xx Server Error' },
]

type DateRange = '1h' | '24h' | '7d' | '30d'

const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: '1h', label: '1h' },
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
]

const PAGE_SIZE = 20

function getStatusBadge(statusCode: number) {
  if (statusCode >= 200 && statusCode < 300) {
    return (
      <span className="inline-flex items-center rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-600">
        {statusCode}
      </span>
    )
  }
  if (statusCode >= 400 && statusCode < 500) {
    return (
      <span className="inline-flex items-center rounded-full bg-yellow-500/10 px-2.5 py-1 text-xs font-medium text-yellow-600">
        {statusCode}
      </span>
    )
  }
  if (statusCode >= 500) {
    return (
      <span className="inline-flex items-center rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-600">
        {statusCode}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
      {statusCode}
    </span>
  )
}

function formatTime(ts: string) {
  const d = new Date(ts)
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<RequestLog[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [provider, setProvider] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateRange, setDateRange] = useState<DateRange>('24h')

  const fetchRequests = async (opts: {
    page: number
    provider: string
    status: string
    range: DateRange
  }) => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams({
        page: String(opts.page),
        pageSize: String(PAGE_SIZE),
        range: opts.range,
      })
      if (opts.provider) params.set('provider', opts.provider)
      if (opts.status) params.set('status', opts.status)

      const data = await api.get<RequestsResponse>(`/v1/analytics/requests?${params.toString()}`)
      setRequests(data.data)
      setTotal(data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load requests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests({ page, provider, status: statusFilter, range: dateRange })
  }, [page, provider, statusFilter, dateRange])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const handleFilterChange = () => {
    setPage(1)
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Requests</h1>
        <p className="mt-1 text-sm text-muted-foreground">View and inspect API request logs.</p>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={provider}
          onChange={(e) => {
            setProvider(e.target.value)
            handleFilterChange()
          }}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {PROVIDER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            handleFilterChange()
          }}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1 rounded-lg border border-border p-1">
          {DATE_RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setDateRange(opt.value)
                handleFilterChange()
              }}
              className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                dateRange === opt.value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {total > 0 && (
          <span className="ml-auto text-sm text-muted-foreground">
            {total.toLocaleString()} total
          </span>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-border p-12 text-center">
          <div className="mx-auto size-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          <p className="mt-3 text-sm text-muted-foreground">Loading requests...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-xl border border-border p-12 text-center">
          <p className="text-muted-foreground">No requests found for the selected filters.</p>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Time
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Provider
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Model
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Status
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Latency
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Cost
                  </th>
                  <th className="px-5 py-3 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Cache
                  </th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req, idx) => (
                  <tr
                    key={req.id}
                    className={`transition-colors hover:bg-muted/30 ${idx !== requests.length - 1 ? 'border-b border-border' : ''}`}
                  >
                    <td className="px-5 py-4 text-xs text-muted-foreground whitespace-nowrap">
                      {formatTime(req.timestamp)}
                    </td>
                    <td className="px-5 py-4 font-medium">
                      {PROVIDER_LABELS[req.provider] ?? req.provider}
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-muted-foreground">
                      {req.model}
                    </td>
                    <td className="px-5 py-4">{getStatusBadge(req.statusCode)}</td>
                    <td className="px-5 py-4 text-right">{req.latencyMs}ms</td>
                    <td className="px-5 py-4 text-right">${req.costUsd.toFixed(6)}</td>
                    <td className="px-5 py-4 text-center">
                      {req.cacheHit ? (
                        <span className="inline-flex items-center rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600">
                          Hit
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          Miss
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="size-4" />
                Prev
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
