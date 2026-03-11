import { parseSSEStream } from './streaming'
import type {
  AnalyticsQuery,
  AnalyticsResponse,
  ApiResponse,
  ChatCompletionChunk,
  ChatCompletionRequest,
  ChatCompletionResponse,
  CreateKeyInput,
  CreateOrgInput,
  CreateTeamInput,
  CreateUserInput,
  EmbeddingRequest,
  EmbeddingResponse,
  LogsQuery,
  ModelListResponse,
  Org,
  PaginatedResponse,
  PaginationParams,
  Provider,
  RavenConfig,
  RequestInterceptor,
  RequestLog,
  ResponseInterceptor,
  Team,
  User,
  VirtualKey,
} from './types'
import { RavenError } from './types'

const DEFAULT_TIMEOUT = 60_000
const DEFAULT_MAX_RETRIES = 3
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504])

interface CrudClient<T, TCreate> {
  list(params?: PaginationParams): Promise<PaginatedResponse<T>>
  get(id: string): Promise<ApiResponse<T>>
  create(input: TCreate): Promise<ApiResponse<T>>
  update(id: string, input: Partial<TCreate>): Promise<ApiResponse<T>>
  delete(id: string): Promise<void>
}

interface KeysClient {
  list(params?: PaginationParams): Promise<PaginatedResponse<VirtualKey>>
  get(id: string): Promise<ApiResponse<VirtualKey>>
  create(input: CreateKeyInput): Promise<ApiResponse<VirtualKey & { key: string }>>
  update(id: string, input: Partial<CreateKeyInput>): Promise<ApiResponse<VirtualKey>>
  delete(id: string): Promise<void>
  revoke(id: string): Promise<void>
}

interface ProvidersClient {
  list(): Promise<ApiResponse<Provider[]>>
  get(id: string): Promise<ApiResponse<Provider>>
  health(id: string): Promise<ApiResponse<{ is_healthy: boolean; latency_ms: number }>>
}

interface AnalyticsClient {
  query(params: AnalyticsQuery): Promise<ApiResponse<AnalyticsResponse>>
}

interface LogsClient {
  list(params?: LogsQuery): Promise<PaginatedResponse<RequestLog>>
  get(id: string): Promise<ApiResponse<RequestLog>>
}

export class Raven {
  private baseUrl: string
  private apiKey: string
  private timeout: number
  private maxRetries: number
  private defaultHeaders: Record<string, string>
  private requestInterceptors: RequestInterceptor[] = []
  private responseInterceptors: ResponseInterceptor[] = []

  chat: {
    completions: {
      create(
        params: ChatCompletionRequest & { stream: true },
      ): Promise<AsyncIterable<ChatCompletionChunk>>
      create(params: ChatCompletionRequest & { stream?: false }): Promise<ChatCompletionResponse>
      create(
        params: ChatCompletionRequest,
      ): Promise<ChatCompletionResponse | AsyncIterable<ChatCompletionChunk>>
    }
  }

  embeddings: {
    create(params: EmbeddingRequest): Promise<EmbeddingResponse>
  }

  models: {
    list(): Promise<ModelListResponse>
  }

  admin: {
    orgs: CrudClient<Org, CreateOrgInput>
    teams: CrudClient<Team, CreateTeamInput>
    users: CrudClient<User, CreateUserInput>
    keys: KeysClient
    providers: ProvidersClient
    analytics: AnalyticsClient
    logs: LogsClient
  }

  constructor(config: RavenConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '')
    this.apiKey = config.apiKey
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES
    this.defaultHeaders = config.headers ?? {}

    this.chat = {
      completions: {
        create: ((params: ChatCompletionRequest) => {
          if (params.stream) {
            return this.createStreamingCompletion(params)
          }
          return this.createCompletion(params)
        }) as typeof this.chat.completions.create,
      },
    }

    this.embeddings = {
      create: (params: EmbeddingRequest) => this.createEmbedding(params),
    }

    this.models = {
      list: () => this.listModels(),
    }

    this.admin = {
      orgs: this.buildCrudClient<Org, CreateOrgInput>('/admin/orgs'),
      teams: this.buildCrudClient<Team, CreateTeamInput>('/admin/teams'),
      users: this.buildCrudClient<User, CreateUserInput>('/admin/users'),
      keys: this.buildKeysClient(),
      providers: this.buildProvidersClient(),
      analytics: this.buildAnalyticsClient(),
      logs: this.buildLogsClient(),
    }
  }

  /**
   * Add a request interceptor that runs before each request.
   */
  onRequest(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor)
  }

  /**
   * Add a response interceptor that runs after each response.
   */
  onResponse(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor)
  }

  private async request<T>(path: string, options: RequestInit = {}, retryCount = 0): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    let init: RequestInit = {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        ...this.defaultHeaders,
        ...(options.headers as Record<string, string> | undefined),
      },
    }

    try {
      for (const interceptor of this.requestInterceptors) {
        init = await interceptor(url, init)
      }

      let response = await fetch(url, init)

      for (const interceptor of this.responseInterceptors) {
        response = await interceptor(response)
      }

      if (!response.ok) {
        const shouldRetry =
          RETRYABLE_STATUS_CODES.has(response.status) && retryCount < this.maxRetries

        if (shouldRetry) {
          const delay = this.calculateBackoff(retryCount, response)
          await this.sleep(delay)
          return this.request<T>(path, options, retryCount + 1)
        }

        const errorBody = await response.text()
        let message = `Request failed with status ${response.status}`
        let code = 'request_error'

        try {
          const parsed = JSON.parse(errorBody) as { error?: { message?: string; code?: string } }
          if (parsed.error?.message) {
            message = parsed.error.message
          }
          if (parsed.error?.code) {
            code = parsed.error.code
          }
        } catch {
          if (errorBody) {
            message = errorBody
          }
        }

        throw new RavenError(message, response.status, code)
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return undefined as T
      }

      return (await response.json()) as T
    } catch (error) {
      if (error instanceof RavenError) {
        throw error
      }

      if (controller.signal.aborted) {
        throw new RavenError(`Request timed out after ${this.timeout}ms`, 0, 'timeout')
      }

      // Retry on network errors
      if (retryCount < this.maxRetries) {
        const delay = this.calculateBackoff(retryCount)
        await this.sleep(delay)
        return this.request<T>(path, options, retryCount + 1)
      }

      throw new RavenError(
        `Network error: ${error instanceof Error ? error.message : String(error)}`,
        0,
        'network_error',
      )
    } finally {
      clearTimeout(timeoutId)
    }
  }

  private async requestStream(
    path: string,
    options: RequestInit = {},
    retryCount = 0,
  ): Promise<Response> {
    const url = `${this.baseUrl}${path}`
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    let init: RequestInit = {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        ...this.defaultHeaders,
        ...(options.headers as Record<string, string> | undefined),
      },
    }

    try {
      for (const interceptor of this.requestInterceptors) {
        init = await interceptor(url, init)
      }

      let response = await fetch(url, init)

      for (const interceptor of this.responseInterceptors) {
        response = await interceptor(response)
      }

      if (!response.ok) {
        const shouldRetry =
          RETRYABLE_STATUS_CODES.has(response.status) && retryCount < this.maxRetries

        if (shouldRetry) {
          const delay = this.calculateBackoff(retryCount, response)
          await this.sleep(delay)
          return this.requestStream(path, options, retryCount + 1)
        }

        const errorBody = await response.text()
        let message = `Request failed with status ${response.status}`
        let code = 'request_error'

        try {
          const parsed = JSON.parse(errorBody) as { error?: { message?: string; code?: string } }
          if (parsed.error?.message) {
            message = parsed.error.message
          }
          if (parsed.error?.code) {
            code = parsed.error.code
          }
        } catch {
          if (errorBody) {
            message = errorBody
          }
        }

        throw new RavenError(message, response.status, code)
      }

      return response
    } catch (error) {
      if (error instanceof RavenError) {
        throw error
      }

      if (controller.signal.aborted) {
        throw new RavenError(`Request timed out after ${this.timeout}ms`, 0, 'timeout')
      }

      if (retryCount < this.maxRetries) {
        const delay = this.calculateBackoff(retryCount)
        await this.sleep(delay)
        return this.requestStream(path, options, retryCount + 1)
      }

      throw new RavenError(
        `Network error: ${error instanceof Error ? error.message : String(error)}`,
        0,
        'network_error',
      )
    } finally {
      clearTimeout(timeoutId)
    }
  }

  private calculateBackoff(retryCount: number, response?: Response): number {
    // Check for Retry-After header
    if (response) {
      const retryAfter = response.headers.get('retry-after')
      if (retryAfter) {
        const seconds = Number.parseInt(retryAfter, 10)
        if (!Number.isNaN(seconds)) {
          return seconds * 1000
        }
      }
    }

    // Exponential backoff with jitter
    const baseDelay = 500
    const maxDelay = 30_000
    const exponentialDelay = baseDelay * 2 ** retryCount
    const jitter = Math.random() * baseDelay
    return Math.min(exponentialDelay + jitter, maxDelay)
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private async createCompletion(params: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    return this.request<ChatCompletionResponse>('/v1/chat/completions', {
      method: 'POST',
      body: JSON.stringify({ ...params, stream: false }),
    })
  }

  private async createStreamingCompletion(
    params: ChatCompletionRequest,
  ): Promise<AsyncIterable<ChatCompletionChunk>> {
    const response = await this.requestStream('/v1/chat/completions', {
      method: 'POST',
      body: JSON.stringify({ ...params, stream: true }),
    })

    return parseSSEStream(response)
  }

  private async createEmbedding(params: EmbeddingRequest): Promise<EmbeddingResponse> {
    return this.request<EmbeddingResponse>('/v1/embeddings', {
      method: 'POST',
      body: JSON.stringify(params),
    })
  }

  private async listModels(): Promise<ModelListResponse> {
    return this.request<ModelListResponse>('/v1/models')
  }

  private toRecord(params: object): Record<string, unknown> {
    return Object.fromEntries(Object.entries(params))
  }

  private buildQueryString(params: Record<string, unknown>): string {
    const searchParams = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        searchParams.set(key, String(value))
      }
    }
    const qs = searchParams.toString()
    return qs ? `?${qs}` : ''
  }

  private buildCrudClient<T, TCreate>(basePath: string): CrudClient<T, TCreate> {
    return {
      list: (params?: PaginationParams) => {
        const qs = this.buildQueryString(this.toRecord(params ?? {}))
        return this.request<PaginatedResponse<T>>(`${basePath}${qs}`)
      },
      get: (id: string) => {
        return this.request<ApiResponse<T>>(`${basePath}/${id}`)
      },
      create: (input: TCreate) => {
        return this.request<ApiResponse<T>>(basePath, {
          method: 'POST',
          body: JSON.stringify(input),
        })
      },
      update: (id: string, input: Partial<TCreate>) => {
        return this.request<ApiResponse<T>>(`${basePath}/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(input),
        })
      },
      delete: (id: string) => {
        return this.request<void>(`${basePath}/${id}`, {
          method: 'DELETE',
        })
      },
    }
  }

  private buildKeysClient(): KeysClient {
    const basePath = '/admin/keys'
    return {
      list: (params?: PaginationParams) => {
        const qs = this.buildQueryString(this.toRecord(params ?? {}))
        return this.request<PaginatedResponse<VirtualKey>>(`${basePath}${qs}`)
      },
      get: (id: string) => {
        return this.request<ApiResponse<VirtualKey>>(`${basePath}/${id}`)
      },
      create: (input: CreateKeyInput) => {
        return this.request<ApiResponse<VirtualKey & { key: string }>>(basePath, {
          method: 'POST',
          body: JSON.stringify(input),
        })
      },
      update: (id: string, input: Partial<CreateKeyInput>) => {
        return this.request<ApiResponse<VirtualKey>>(`${basePath}/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(input),
        })
      },
      delete: (id: string) => {
        return this.request<void>(`${basePath}/${id}`, {
          method: 'DELETE',
        })
      },
      revoke: (id: string) => {
        return this.request<void>(`${basePath}/${id}/revoke`, {
          method: 'POST',
        })
      },
    }
  }

  private buildProvidersClient(): ProvidersClient {
    const basePath = '/admin/providers'
    return {
      list: () => {
        return this.request<ApiResponse<Provider[]>>(basePath)
      },
      get: (id: string) => {
        return this.request<ApiResponse<Provider>>(`${basePath}/${id}`)
      },
      health: (id: string) => {
        return this.request<ApiResponse<{ is_healthy: boolean; latency_ms: number }>>(
          `${basePath}/${id}/health`,
        )
      },
    }
  }

  private buildAnalyticsClient(): AnalyticsClient {
    return {
      query: (params: AnalyticsQuery) => {
        const qs = this.buildQueryString(this.toRecord(params))
        return this.request<ApiResponse<AnalyticsResponse>>(`/admin/analytics${qs}`)
      },
    }
  }

  private buildLogsClient(): LogsClient {
    const basePath = '/admin/logs'
    return {
      list: (params?: LogsQuery) => {
        const qs = this.buildQueryString(this.toRecord(params ?? {}))
        return this.request<PaginatedResponse<RequestLog>>(`${basePath}${qs}`)
      },
      get: (id: string) => {
        return this.request<ApiResponse<RequestLog>>(`${basePath}/${id}`)
      },
    }
  }
}
