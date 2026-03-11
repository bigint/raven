export interface RavenConfig {
  baseUrl: string
  apiKey: string
  timeout?: number
  maxRetries?: number
  headers?: Record<string, string>
}

export interface ChatCompletionRequest {
  model: string
  messages: Message[]
  temperature?: number
  top_p?: number
  max_tokens?: number
  stream?: boolean
  tools?: Tool[]
  tool_choice?: ToolChoice
  seed?: number
  stop?: string | string[]
  response_format?: ResponseFormat
}

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | ContentPart[] | null
  name?: string
  tool_calls?: ToolCall[]
  tool_call_id?: string
}

export interface ContentPart {
  type: 'text' | 'image_url'
  text?: string
  image_url?: { url: string; detail?: 'auto' | 'low' | 'high' }
}

export interface ChatCompletionResponse {
  id: string
  object: 'chat.completion'
  created: number
  model: string
  choices: Choice[]
  usage: Usage
}

export interface Choice {
  index: number
  message: Message
  finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter'
}

export interface Usage {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

export interface ChatCompletionChunk {
  id: string
  object: 'chat.completion.chunk'
  created: number
  model: string
  choices: StreamChoice[]
}

export interface StreamChoice {
  index: number
  delta: Partial<Message>
  finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null
}

// Tool types
export interface Tool {
  type: 'function'
  function: FunctionDef
}

export interface FunctionDef {
  name: string
  description?: string
  parameters?: Record<string, unknown>
}

export type ToolChoice = 'none' | 'auto' | { type: 'function'; function: { name: string } }

export interface ToolCall {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

// Response format
export interface ResponseFormat {
  type: 'text' | 'json_object'
}

// Embeddings
export interface EmbeddingRequest {
  model: string
  input: string | string[]
}

export interface EmbeddingResponse {
  object: 'list'
  data: EmbeddingData[]
  model: string
  usage: { prompt_tokens: number; total_tokens: number }
}

export interface EmbeddingData {
  object: 'embedding'
  index: number
  embedding: number[]
}

// Models
export interface ModelListResponse {
  object: 'list'
  data: Model[]
}

export interface Model {
  id: string
  object: 'model'
  created: number
  owned_by: string
}

// Admin types
export interface Org {
  id: string
  name: string
  slug: string
  budget_limit_usd?: number
  budget_period?: string
  rate_limit_rpm?: number
  rate_limit_tpm?: number
  created_at: string
  updated_at: string
}

export interface Team {
  id: string
  org_id: string
  name: string
  slug: string
  budget_limit_usd?: number
  budget_period?: string
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'member' | 'viewer'
  created_at: string
  updated_at: string
}

export interface VirtualKey {
  id: string
  name: string
  key_prefix: string
  user_id: string
  team_id: string
  budget_limit_usd?: number
  rate_limit_rpm?: number
  is_active: boolean
  expires_at?: string
  last_used_at?: string
  created_at: string
}

export interface CreateKeyInput {
  name: string
  team_id: string
  budget_limit_usd?: number
  budget_period?: string
  rate_limit_rpm?: number
  rate_limit_tpm?: number
  model_allowlist?: string[]
  expires_at?: string
}

export interface CreateOrgInput {
  name: string
  slug?: string
  budget_limit_usd?: number
  budget_period?: string
}

export interface CreateTeamInput {
  name: string
  org_id: string
  slug?: string
  budget_limit_usd?: number
}

export interface CreateUserInput {
  email: string
  name: string
  role?: 'admin' | 'member' | 'viewer'
}

export interface Provider {
  id: string
  name: string
  display_name: string
  is_configured: boolean
  is_healthy: boolean
  models: string[]
}

export interface RequestLog {
  id: string
  timestamp: string
  provider: string
  model: string
  input_tokens: number
  output_tokens: number
  cost_usd: number
  latency_ms: number
  status_code: number
  cache_status: string
  org_id?: string
  team_id?: string
  user_id?: string
}

// API response envelope
export interface ApiResponse<T> {
  data: T
  meta?: { total: number; page: number; per_page: number }
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: { total: number; page: number; per_page: number; has_more: boolean }
}

// Pagination params
export interface PaginationParams {
  page?: number
  per_page?: number
}

// Analytics
export interface AnalyticsQuery {
  start_date: string
  end_date: string
  group_by?: 'hour' | 'day' | 'week' | 'month'
  org_id?: string
  team_id?: string
  model?: string
  provider?: string
}

export interface AnalyticsResponse {
  data: AnalyticsDataPoint[]
  summary: {
    total_requests: number
    total_cost_usd: number
    total_input_tokens: number
    total_output_tokens: number
    avg_latency_ms: number
  }
}

export interface AnalyticsDataPoint {
  timestamp: string
  requests: number
  cost_usd: number
  input_tokens: number
  output_tokens: number
  avg_latency_ms: number
}

// Logs query
export interface LogsQuery extends PaginationParams {
  start_date?: string
  end_date?: string
  org_id?: string
  team_id?: string
  user_id?: string
  model?: string
  provider?: string
  status_code?: number
  min_latency_ms?: number
  max_latency_ms?: number
}

// Error
export class RavenError extends Error {
  status: number
  code: string

  constructor(message: string, status: number, code: string) {
    super(message)
    this.status = status
    this.code = code
    this.name = 'RavenError'
  }
}

// Interceptors
export type RequestInterceptor = (
  url: string,
  init: RequestInit,
) => RequestInit | Promise<RequestInit>
export type ResponseInterceptor = (response: Response) => Response | Promise<Response>
