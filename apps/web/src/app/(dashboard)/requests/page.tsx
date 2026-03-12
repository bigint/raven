'use client'

import { ChevronLeft, ChevronRight, Radio } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Select } from '@/components/select'
import { useEventStream } from '@/hooks/use-event-stream'
import { API_URL, api, getOrgId } from '@/lib/api'

interface RequestLog {
  id: string
  createdAt: string
  provider: string
  model: string
  statusCode: number
  latencyMs: number
  cost: string
  cacheHit: boolean
}

interface RequestsResponse {
  data: RequestLog[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
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
  if (!ts) return '—'
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return '—'
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
  const [isLive, setIsLive] = useState(false)

  const [hasNewData, setHasNewData] = useState(false)

  const [provider, setProvider] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateRange, setDateRange] = useState<DateRange>('24h')

  const eventSourceRef = useRef<EventSource | null>(null)

  const fetchRequests = useCallback(
    async (opts: { page: number; provider: string; status: string; range: DateRange }) => {
      try {
        setLoading(true)
        setError(null)
        const now = new Date()
        const rangeMs: Record<DateRange, number> = {
          '1h': 3_600_000,
          '24h': 86_400_000,
          '7d': 604_800_000,
          '30d': 2_592_000_000,
        }
        const from = new Date(now.getTime() - rangeMs[opts.range]).toISOString()
        const params = new URLSearchParams({
          page: String(opts.page),
          limit: String(PAGE_SIZE),
          from,
        })
        if (opts.provider) params.set('provider', opts.provider)
        if (opts.status) {
          const codeMap: Record<string, string> = { '2xx': '200', '4xx': '400', '5xx': '500' }
          const code = codeMap[opts.status]
          if (code) params.set('statusCode', code)
        }

        const data = await api.get<RequestsResponse>(`/v1/analytics/requests?${params.toString()}`)
        setRequests(data.data)
        setTotal(data.pagination.total)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load requests')
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  useEventStream({
    events: ['request.created'],
    onEvent: () => setHasNewData(true),
    enabled: !isLive,
  })

  // Reset new data indicator when filters change
  useEffect(() => setHasNewData(false), [page, provider, statusFilter, dateRange])

  // Standard polling mode
  useEffect(() => {
    if (isLive) return
    fetchRequests({ page, provider, status: statusFilter, range: dateRange })
  }, [fetchRequests, isLive, page, provider, statusFilter, dateRange])

  // Live SSE mode
  useEffect(() => {
    if (!isLive) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      return
    }

    setLoading(true)
    setError(null)

    const orgId = getOrgId()
    const url = `${API_URL}/v1/analytics/requests/live${orgId ? `?orgId=${orgId}` : ''}`
    const es = new EventSource(url, { withCredentials: true })
    eventSourceRef.current = es

    es.addEventListener('init', (e) => {
      const logs: RequestLog[] = JSON.parse(e.data)
      setRequests(logs)
      setTotal(logs.length)
      setLoading(false)
    })

    es.addEventListener('new', (e) => {
      const newLogs: RequestLog[] = JSON.parse(e.data)
      setRequests((prev) => {
        const merged = [...newLogs, ...prev]
        const seen = new Set<string>()
        return merged
          .filter((r) => {
            if (seen.has(r.id)) return false
            seen.add(r.id)
            return true
          })
          .slice(0, 200)
      })
      setTotal((prev) => prev + newLogs.length)
    })

    es.addEventListener('error', () => {
      setError('Live connection lost. Reconnecting...')
      setLoading(false)
    })

    return () => {
      es.close()
      eventSourceRef.current = null
    }
  }, [isLive])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const handleFilterChange = () => {
    setPage(1)
  }

  const toggleLive = () => {
    setIsLive((prev) => !prev)
    setPage(1)
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Requests</h1>
          <p className="mt-1 text-sm text-muted-foreground">View and inspect API request logs.</p>
        </div>
        <button
          type="button"
          onClick={toggleLive}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            isLive
              ? 'bg-green-500/10 text-green-600 border border-green-500/30'
              : 'border border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          }`}
        >
          <Radio className={`size-4 ${isLive ? 'animate-pulse' : ''}`} />
          {isLive ? 'Live' : 'Go Live'}
        </button>
      </div>

      {/* Filters */}
      {!isLive && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Select
            value={provider}
            onChange={(v) => {
              setProvider(v)
              handleFilterChange()
            }}
            options={PROVIDER_OPTIONS}
            className="w-44"
          />

          <Select
            value={statusFilter}
            onChange={(v) => {
              setStatusFilter(v)
              handleFilterChange()
            }}
            options={STATUS_OPTIONS}
            className="w-40"
          />

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
      )}

      {isLive && (
        <div className="mb-4 flex items-center gap-2">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-green-500" />
          </span>
          <span className="text-sm text-muted-foreground">
            Streaming live — {requests.length} requests
          </span>
        </div>
      )}

      {hasNewData && !isLive && (
        <button
          type="button"
          onClick={() => {
            setHasNewData(false)
            fetchRequests({ page, provider, status: statusFilter, range: dateRange })
          }}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
        >
          New requests available — click to refresh
        </button>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-border p-12 text-center">
          <div className="mx-auto size-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          <p className="mt-3 text-sm text-muted-foreground">
            {isLive ? 'Connecting to live stream...' : 'Loading requests...'}
          </p>
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-xl border border-border p-12 text-center">
          <p className="text-muted-foreground">
            {isLive ? 'Waiting for new requests...' : 'No requests found for the selected filters.'}
          </p>
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
                      {formatTime(req.createdAt)}
                    </td>
                    <td className="px-5 py-4 font-medium">
                      {PROVIDER_LABELS[req.provider] ?? req.provider}
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-muted-foreground">
                      {req.model}
                    </td>
                    <td className="px-5 py-4">{getStatusBadge(req.statusCode)}</td>
                    <td className="px-5 py-4 text-right">{req.latencyMs}ms</td>
                    <td className="px-5 py-4 text-right">${Number(req.cost).toFixed(6)}</td>
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

          {/* Pagination — only in non-live mode */}
          {!isLive && (
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
          )}
        </>
      )}
    </div>
  )
}
