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

export class ApiClient {
  private baseUrl: string
  private apiKey: string

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.apiKey = apiKey
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const res = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
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
    return this.request(`/admin/v1/orgs${buildQuery(opts ?? {})}`)
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
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteOrg(id: string): Promise<void> {
    return this.request(`/admin/v1/orgs/${id}`, { method: 'DELETE' })
  }

  // Teams
  async listTeams(orgId: string, opts?: ListOpts): Promise<PaginatedResponse<Team>> {
    return this.request(`/admin/v1/orgs/${orgId}/teams${buildQuery(opts ?? {})}`)
  }

  async createTeam(orgId: string, data: CreateTeamInput): Promise<Team> {
    return this.request(`/admin/v1/orgs/${orgId}/teams`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Users
  async listUsers(opts?: ListOpts): Promise<PaginatedResponse<User>> {
    return this.request(`/admin/v1/users${buildQuery(opts ?? {})}`)
  }

  async createUser(data: CreateUserInput): Promise<User> {
    return this.request('/admin/v1/users', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Keys
  async listKeys(opts?: ListOpts): Promise<PaginatedResponse<VirtualKey>> {
    return this.request(`/admin/v1/keys${buildQuery(opts ?? {})}`)
  }

  async createKey(data: CreateKeyInput): Promise<VirtualKey> {
    return this.request('/admin/v1/keys', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async rotateKey(id: string): Promise<VirtualKey> {
    return this.request(`/admin/v1/keys/${id}/rotate`, { method: 'POST' })
  }

  async deleteKey(id: string): Promise<void> {
    return this.request(`/admin/v1/keys/${id}`, { method: 'DELETE' })
  }

  // Providers
  async listProviders(): Promise<Provider[]> {
    return this.request('/admin/v1/providers')
  }

  async getProviderHealth(id: string): Promise<ProviderHealth> {
    return this.request(`/admin/v1/providers/${id}/health`)
  }

  async createProviderConfig(data: CreateProviderConfigInput): Promise<ProviderConfig> {
    return this.request('/admin/v1/providers/config', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateProviderConfig(
    name: string,
    data: UpdateProviderConfigInput,
  ): Promise<ProviderConfig> {
    return this.request(`/admin/v1/providers/config/${name}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteProviderConfig(name: string): Promise<void> {
    return this.request(`/admin/v1/providers/config/${name}`, { method: 'DELETE' })
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
    return this.request(`/admin/v1/logs${buildQuery(opts)}`)
  }

  async getLog(id: string): Promise<RequestLog> {
    return this.request(`/admin/v1/logs/${id}`)
  }

  // Models
  async listModels(): Promise<Model[]> {
    return this.request('/admin/v1/models')
  }

  // Budgets
  async listBudgets(): Promise<BudgetConfig[]> {
    return this.request('/admin/v1/budgets')
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
  import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '')
const API_KEY = import.meta.env.VITE_API_KEY || import.meta.env.VITE_RAVEN_ADMIN_KEY || ''

export const apiClient = new ApiClient(API_BASE_URL, API_KEY)
