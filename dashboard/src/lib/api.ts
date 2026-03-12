import type {
  AnalyticsOpts,
  BudgetConfig,
  CacheData,
  CostData,
  CreateKeyInput,
  CreateOrgInput,
  CreateProviderConfigInput,
  CreateTeamInput,
  CreateUserInput,
  GatewaySettings,
  LatencyData,
  ListOpts,
  LogQueryOpts,
  Model,
  Org,
  PaginatedResponse,
  Provider,
  ProviderConfig,
  ProviderHealth,
  RequestLog,
  Team,
  UpdateOrgInput,
  UpdateProviderConfigInput,
  UsageData,
  User,
  VirtualKey,
} from './types'

interface RawPaginatedMeta {
  readonly total?: number
  readonly page?: number
  readonly per_page?: number
}

interface RawPaginatedResponse<T> {
  readonly data: T[]
  readonly meta?: RawPaginatedMeta
}

interface RawListResponse<T> {
  readonly data?: T[]
}

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

function buildQuery(params: object): string {
  const entries = Object.entries(params as Record<string, unknown>).filter(
    ([, v]) => v !== undefined && v !== null && v !== '',
  )
  if (entries.length === 0) return ''
  const searchParams = new URLSearchParams()
  for (const [key, value] of entries) {
    searchParams.set(key, String(value))
  }
  return `?${searchParams.toString()}`
}

function toPaginated<T>(res: RawPaginatedResponse<T>): PaginatedResponse<T> {
  const page = res.meta?.page ?? 1
  const perPage = res.meta?.per_page ?? 20
  const total = res.meta?.total ?? 0
  return {
    data: res.data ?? [],
    total,
    page,
    per_page: perPage,
    has_more: page * perPage < total,
  }
}

export class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const res = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    })

    if (!res.ok) {
      const body = await res.text().catch(() => 'Unknown error')
      throw new ApiError(res.status, body)
    }

    if (res.status === 204) return undefined as T
    return res.json() as Promise<T>
  }

  // Orgs
  async listOrgs(opts?: ListOpts): Promise<PaginatedResponse<Org>> {
    const res = await this.request<RawPaginatedResponse<Org>>(`/admin/v1/orgs${buildQuery(opts ?? {})}`)
    return toPaginated(res)
  }

  async createOrg(data: CreateOrgInput): Promise<Org> {
    return this.request('/admin/v1/orgs', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getOrg(id: string): Promise<Org> {
    return this.request(`/admin/v1/orgs/${id}`)
  }

  async updateOrg(id: string, data: UpdateOrgInput): Promise<Org> {
    return this.request(`/admin/v1/orgs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteOrg(id: string): Promise<void> {
    return this.request(`/admin/v1/orgs/${id}`, { method: 'DELETE' })
  }

  // Teams
  async listTeams(orgId: string, opts?: ListOpts): Promise<PaginatedResponse<Team>> {
    const res = await this.request<RawPaginatedResponse<Team>>(`/admin/v1/teams${buildQuery({ org_id: orgId, ...(opts ?? {}) })}`)
    return toPaginated(res)
  }

  async createTeam(orgId: string, data: CreateTeamInput): Promise<Team> {
    return this.request('/admin/v1/teams', {
      method: 'POST',
      body: JSON.stringify({ ...data, org_id: orgId }),
    })
  }

  // Users
  async listUsers(opts?: ListOpts): Promise<PaginatedResponse<User>> {
    const res = await this.request<RawPaginatedResponse<User>>(`/admin/v1/users${buildQuery(opts ?? {})}`)
    return toPaginated(res)
  }

  async createUser(data: CreateUserInput): Promise<User> {
    return this.request('/admin/v1/users', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Keys
  async listKeys(opts?: ListOpts): Promise<PaginatedResponse<VirtualKey>> {
    const res = await this.request<RawPaginatedResponse<VirtualKey>>(`/admin/v1/keys${buildQuery(opts ?? {})}`)
    return toPaginated(res)
  }

  async createKey(data: CreateKeyInput): Promise<VirtualKey> {
    return this.request('/admin/v1/keys', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async deleteKey(id: string): Promise<void> {
    return this.request(`/admin/v1/keys/${id}`, { method: 'DELETE' })
  }

  // Providers
  async listProviders(): Promise<Provider[]> {
    const res = await this.request<Provider[] | RawListResponse<Provider>>('/admin/v1/providers')
    return Array.isArray(res) ? res : res.data ?? []
  }

  async getProviderHealth(name: string): Promise<ProviderHealth> {
    return this.request(`/admin/v1/providers/${name}/health`)
  }

  async createProviderConfig(data: CreateProviderConfigInput): Promise<ProviderConfig> {
    return this.request('/admin/v1/providers', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateProviderConfig(
    name: string,
    data: UpdateProviderConfigInput,
  ): Promise<ProviderConfig> {
    return this.request(`/admin/v1/providers/${name}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteProviderConfig(name: string): Promise<void> {
    return this.request(`/admin/v1/providers/${name}`, { method: 'DELETE' })
  }

  // Analytics
  async getUsage(opts: AnalyticsOpts): Promise<UsageData> {
    return this.request(`/admin/v1/analytics/usage${buildQuery(opts)}`)
  }

  async getCost(opts: AnalyticsOpts): Promise<CostData> {
    return this.request(`/admin/v1/analytics/cost${buildQuery(opts)}`)
  }

  async getLatency(opts: AnalyticsOpts): Promise<LatencyData> {
    return this.request(`/admin/v1/analytics/latency${buildQuery(opts)}`)
  }

  async getCacheStats(opts: AnalyticsOpts): Promise<CacheData> {
    return this.request(`/admin/v1/analytics/cache${buildQuery(opts)}`)
  }

  // Logs
  async listLogs(opts: LogQueryOpts): Promise<PaginatedResponse<RequestLog>> {
    const res = await this.request<RawPaginatedResponse<RequestLog>>(`/admin/v1/logs${buildQuery(opts)}`)
    return toPaginated(res)
  }

  async getLog(id: string): Promise<RequestLog> {
    return this.request(`/admin/v1/logs/${id}`)
  }

  // Models
  async listModels(): Promise<Model[]> {
    const res = await this.request<Model[] | RawListResponse<Model>>('/admin/v1/models')
    return Array.isArray(res) ? res : res.data ?? []
  }

  // Budgets
  async listBudgets(): Promise<BudgetConfig[]> {
    const res = await this.request<BudgetConfig[] | RawListResponse<BudgetConfig>>('/admin/v1/budgets')
    return Array.isArray(res) ? res : res.data ?? []
  }

  async createBudget(data: Partial<BudgetConfig>): Promise<BudgetConfig> {
    return this.request('/admin/v1/budgets', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateBudget(id: string, data: Partial<BudgetConfig>): Promise<BudgetConfig> {
    return this.request(`/admin/v1/budgets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  // Settings
  async getSettings(): Promise<GatewaySettings> {
    return this.request('/admin/v1/settings')
  }
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== 'undefined' ? window.location.origin : '')

export const apiClient = new ApiClient(API_BASE_URL)
