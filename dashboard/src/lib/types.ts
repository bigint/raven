export interface Org {
  id: string
  name: string
  slug: string
  description?: string
  created_at: string
  updated_at: string
}

export interface CreateOrgInput {
  name: string
  slug: string
  description?: string
}

export type UpdateOrgInput = Partial<CreateOrgInput>

export interface Team {
  id: string
  org_id: string
  name: string
  slug: string
  description?: string
  budget_limit?: number
  created_at: string
  updated_at: string
}

export interface CreateTeamInput {
  name: string
  slug: string
  description?: string
  budget_limit?: number
}

export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'member' | 'viewer'
  org_id?: string
  team_ids: string[]
  created_at: string
  updated_at: string
}

export interface CreateUserInput {
  email: string
  name: string
  role: 'admin' | 'member' | 'viewer'
  org_id?: string
  team_ids?: string[]
}

export interface VirtualKey {
  id: string
  name: string
  key_prefix: string
  key_hash?: string
  plain_key?: string
  org_id?: string
  team_id?: string
  user_id?: string
  budget_limit?: number
  rate_limit?: number
  rate_limit_window?: string
  allowed_models?: string[]
  metadata?: Record<string, string>
  expires_at?: string
  last_used_at?: string
  created_at: string
  updated_at: string
}

export interface CreateKeyInput {
  name: string
  org_id?: string
  team_id?: string
  user_id?: string
  budget_limit?: number
  rate_limit?: number
  rate_limit_window?: string
  allowed_models?: string[]
  expires_at?: string
  metadata?: Record<string, string>
}

export interface Provider {
  name: string
  display_name: string
  base_url: string
  healthy: boolean
  models: number
  configured: boolean
  enabled: boolean
}

export interface ProviderHealth {
  provider_id: string
  status: 'healthy' | 'degraded' | 'down'
  latency_ms: number
  error_rate: number
  active_connections: number
  last_check: string
}

export interface ProviderConfig {
  id: string
  name: string
  display_name: string
  api_key_masked: string
  base_url: string
  enabled: boolean
  created_at: string
  updated_at: string
}

export interface CreateProviderConfigInput {
  name: string
  api_key: string
  base_url?: string
  enabled?: boolean
}

export interface UpdateProviderConfigInput {
  api_key?: string
  base_url?: string
  enabled?: boolean
}

export interface ProviderWithConfig {
  name: string
  display_name: string
  base_url: string
  models_count: number
  configured: boolean
  enabled: boolean
  api_key_masked: string
  health: {
    status: 'healthy' | 'degraded' | 'down' | 'unconfigured'
    latency_ms: number
    error_rate: number
  }
}

export interface RequestLog {
  id: string
  timestamp: string
  method: string
  path: string
  provider: string
  model: string
  status_code: number
  latency_ms: number
  input_tokens: number
  output_tokens: number
  total_tokens: number
  cost: number
  cache_hit: boolean
  user_id?: string
  team_id?: string
  org_id?: string
  key_id?: string
  error?: string
  metadata?: Record<string, string>
}

export interface UsageData {
  total_requests: number
  total_tokens: number
  total_input_tokens: number
  total_output_tokens: number
  requests_by_model: Record<string, number>
  requests_by_provider: Record<string, number>
  timeseries: TimeseriesPoint[]
}

export interface CostData {
  total_cost: number
  cost_by_provider: Record<string, number>
  cost_by_model: Record<string, number>
  cost_by_team: Record<string, number>
  projected_monthly: number
  cache_savings: number
  timeseries: TimeseriesPoint[]
}

export interface LatencyData {
  avg_latency_ms: number
  p50_latency_ms: number
  p95_latency_ms: number
  p99_latency_ms: number
  timeseries: TimeseriesPoint[]
}

export interface CacheData {
  hit_rate: number
  miss_rate: number
  total_hits: number
  total_misses: number
  storage_bytes: number
  savings: number
  timeseries: TimeseriesPoint[]
}

export interface TimeseriesPoint {
  timestamp: string
  value: number
  label?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  per_page: number
  has_more: boolean
}

export interface ListOpts {
  page?: number
  per_page?: number
  search?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface AnalyticsOpts {
  start: string
  end: string
  granularity?: 'minute' | 'hour' | 'day' | 'week' | 'month'
  provider?: string
  model?: string
  team_id?: string
  org_id?: string
}

export interface LogQueryOpts extends ListOpts {
  cursor?: string
  limit?: number
  provider?: string
  model?: string
  status?: number
  cache_hit?: boolean
  team_id?: string
  user_id?: string
  start?: string
  end?: string
}

export interface BudgetConfig {
  id: string
  entity_type: 'org' | 'team' | 'key'
  entity_id: string
  limit: number
  period: 'daily' | 'weekly' | 'monthly'
  current_usage: number
  alert_threshold: number
  created_at: string
  updated_at: string
}

export interface GatewaySettings {
  version: string
  uptime?: string
  cache_enabled: boolean
  guardrails_enabled: boolean
  rate_limiting_enabled: boolean
  providers: string[]
}

export interface Model {
  id: string
  name: string
  provider: string
  input_price_per_token: number
  output_price_per_token: number
  context_window: number
  max_output_tokens: number
  supports_streaming: boolean
  supports_vision: boolean
  supports_function_calling: boolean
}
