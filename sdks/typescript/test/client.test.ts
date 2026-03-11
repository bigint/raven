import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Raven, RavenError } from '../src/index'

const mockFetch = vi.fn()
globalThis.fetch = mockFetch

function jsonResponse(data: unknown, status = 200, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  })
}

function sseResponse(chunks: string[]): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk))
      }
      controller.close()
    },
  })

  return new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  })
}

describe('Raven', () => {
  let client: Raven

  beforeEach(() => {
    mockFetch.mockReset()
    client = new Raven({
      baseUrl: 'https://gateway.example.com',
      apiKey: 'test-api-key',
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initialization', () => {
    it('should create a client with required config', () => {
      const raven = new Raven({
        baseUrl: 'https://gateway.example.com',
        apiKey: 'test-key',
      })
      expect(raven).toBeInstanceOf(Raven)
    })

    it('should strip trailing slashes from baseUrl', () => {
      const raven = new Raven({
        baseUrl: 'https://gateway.example.com///',
        apiKey: 'test-key',
      })

      mockFetch.mockResolvedValueOnce(
        jsonResponse({ object: 'list', data: [] }),
      )

      raven.models.list()
      expect(mockFetch).toHaveBeenCalledWith(
        'https://gateway.example.com/v1/models',
        expect.objectContaining({}),
      )
    })

    it('should expose chat, embeddings, models, and admin namespaces', () => {
      expect(client.chat).toBeDefined()
      expect(client.chat.completions).toBeDefined()
      expect(client.chat.completions.create).toBeInstanceOf(Function)
      expect(client.embeddings).toBeDefined()
      expect(client.embeddings.create).toBeInstanceOf(Function)
      expect(client.models).toBeDefined()
      expect(client.models.list).toBeInstanceOf(Function)
      expect(client.admin).toBeDefined()
      expect(client.admin.orgs).toBeDefined()
      expect(client.admin.teams).toBeDefined()
      expect(client.admin.users).toBeDefined()
      expect(client.admin.keys).toBeDefined()
      expect(client.admin.providers).toBeDefined()
      expect(client.admin.analytics).toBeDefined()
      expect(client.admin.logs).toBeDefined()
    })
  })

  describe('request building', () => {
    it('should send authorization header', async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ object: 'list', data: [] }),
      )

      await client.models.list()

      expect(mockFetch).toHaveBeenCalledWith(
        'https://gateway.example.com/v1/models',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-key',
            'Content-Type': 'application/json',
          }),
        }),
      )
    })

    it('should include custom headers', async () => {
      const customClient = new Raven({
        baseUrl: 'https://gateway.example.com',
        apiKey: 'test-key',
        headers: { 'X-Custom': 'value' },
      })

      mockFetch.mockResolvedValueOnce(
        jsonResponse({ object: 'list', data: [] }),
      )

      await customClient.models.list()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom': 'value',
          }),
        }),
      )
    })

    it('should send correct body for chat completions', async () => {
      const completion = {
        id: 'chatcmpl-123',
        object: 'chat.completion' as const,
        created: 1234567890,
        model: 'gpt-4o',
        choices: [
          {
            index: 0,
            message: { role: 'assistant' as const, content: 'Hello!' },
            finish_reason: 'stop' as const,
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      }

      mockFetch.mockResolvedValueOnce(jsonResponse(completion))

      await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hi' }],
        temperature: 0.7,
      })

      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit]
      const body = JSON.parse(init.body as string)

      expect(body).toEqual({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hi' }],
        temperature: 0.7,
        stream: false,
      })
    })
  })

  describe('chat completions', () => {
    it('should return a completion response', async () => {
      const completion = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1234567890,
        model: 'gpt-4o',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'Hello there!' },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      }

      mockFetch.mockResolvedValueOnce(jsonResponse(completion))

      const result = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hi' }],
      })

      expect(result).toEqual(completion)
    })
  })

  describe('streaming', () => {
    it('should return an async iterable for streaming', async () => {
      const chunks = [
        'data: {"id":"chatcmpl-1","object":"chat.completion.chunk","created":123,"model":"gpt-4o","choices":[{"index":0,"delta":{"role":"assistant","content":"Hello"},"finish_reason":null}]}\n\n',
        'data: {"id":"chatcmpl-1","object":"chat.completion.chunk","created":123,"model":"gpt-4o","choices":[{"index":0,"delta":{"content":" world"},"finish_reason":null}]}\n\n',
        'data: [DONE]\n\n',
      ]

      mockFetch.mockResolvedValueOnce(sseResponse(chunks))

      const stream = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hi' }],
        stream: true,
      })

      const collected = []
      for await (const chunk of stream) {
        collected.push(chunk)
      }

      expect(collected).toHaveLength(2)
      expect(collected[0]?.choices[0]?.delta.content).toBe('Hello')
      expect(collected[1]?.choices[0]?.delta.content).toBe(' world')
    })

    it('should handle multi-line SSE chunks in a single buffer', async () => {
      const data =
        'data: {"id":"chatcmpl-1","object":"chat.completion.chunk","created":123,"model":"gpt-4o","choices":[{"index":0,"delta":{"content":"Hi"},"finish_reason":null}]}\n\ndata: [DONE]\n\n'

      mockFetch.mockResolvedValueOnce(sseResponse([data]))

      const stream = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hi' }],
        stream: true,
      })

      const collected = []
      for await (const chunk of stream) {
        collected.push(chunk)
      }

      expect(collected).toHaveLength(1)
    })
  })

  describe('embeddings', () => {
    it('should create embeddings', async () => {
      const embeddingResponse = {
        object: 'list',
        data: [{ object: 'embedding', index: 0, embedding: [0.1, 0.2, 0.3] }],
        model: 'text-embedding-3-small',
        usage: { prompt_tokens: 5, total_tokens: 5 },
      }

      mockFetch.mockResolvedValueOnce(jsonResponse(embeddingResponse))

      const result = await client.embeddings.create({
        model: 'text-embedding-3-small',
        input: 'Hello world',
      })

      expect(result.data[0]?.embedding).toEqual([0.1, 0.2, 0.3])
    })
  })

  describe('models', () => {
    it('should list models', async () => {
      const modelsResponse = {
        object: 'list',
        data: [
          { id: 'gpt-4o', object: 'model', created: 123, owned_by: 'openai' },
          { id: 'claude-sonnet-4-20250514', object: 'model', created: 123, owned_by: 'anthropic' },
        ],
      }

      mockFetch.mockResolvedValueOnce(jsonResponse(modelsResponse))

      const result = await client.models.list()

      expect(result.data).toHaveLength(2)
      expect(result.data[0]?.id).toBe('gpt-4o')
    })
  })

  describe('retry logic', () => {
    it('should retry on 429 status', async () => {
      mockFetch
        .mockResolvedValueOnce(
          jsonResponse({ error: { message: 'Rate limited' } }, 429),
        )
        .mockResolvedValueOnce(
          jsonResponse({ object: 'list', data: [] }),
        )

      const result = await client.models.list()

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result).toEqual({ object: 'list', data: [] })
    })

    it('should retry on 500 status', async () => {
      mockFetch
        .mockResolvedValueOnce(
          jsonResponse({ error: { message: 'Server error' } }, 500),
        )
        .mockResolvedValueOnce(
          jsonResponse({ object: 'list', data: [] }),
        )

      const result = await client.models.list()

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result).toEqual({ object: 'list', data: [] })
    })

    it('should retry on 502 status', async () => {
      mockFetch
        .mockResolvedValueOnce(
          jsonResponse({ error: { message: 'Bad gateway' } }, 502),
        )
        .mockResolvedValueOnce(
          jsonResponse({ object: 'list', data: [] }),
        )

      const result = await client.models.list()

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result).toEqual({ object: 'list', data: [] })
    })

    it('should retry on 503 status', async () => {
      mockFetch
        .mockResolvedValueOnce(
          jsonResponse({ error: { message: 'Service unavailable' } }, 503),
        )
        .mockResolvedValueOnce(
          jsonResponse({ object: 'list', data: [] }),
        )

      const result = await client.models.list()

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result).toEqual({ object: 'list', data: [] })
    })

    it('should retry on 504 status', async () => {
      mockFetch
        .mockResolvedValueOnce(
          jsonResponse({ error: { message: 'Gateway timeout' } }, 504),
        )
        .mockResolvedValueOnce(
          jsonResponse({ object: 'list', data: [] }),
        )

      const result = await client.models.list()

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result).toEqual({ object: 'list', data: [] })
    })

    it('should respect maxRetries config', async () => {
      const limitedClient = new Raven({
        baseUrl: 'https://gateway.example.com',
        apiKey: 'test-key',
        maxRetries: 1,
      })

      mockFetch
        .mockResolvedValueOnce(jsonResponse({ error: { message: 'Rate limited' } }, 429))
        .mockResolvedValueOnce(jsonResponse({ error: { message: 'Rate limited' } }, 429))

      await expect(limitedClient.models.list()).rejects.toThrow(RavenError)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should not retry on 400 status', async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ error: { message: 'Bad request', code: 'bad_request' } }, 400),
      )

      await expect(
        client.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'Hi' }],
        }),
      ).rejects.toThrow(RavenError)

      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('should retry on network errors', async () => {
      mockFetch
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce(jsonResponse({ object: 'list', data: [] }))

      const result = await client.models.list()

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result).toEqual({ object: 'list', data: [] })
    })
  })

  describe('error handling', () => {
    it('should throw RavenError with parsed error details', async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse(
          { error: { message: 'Model not found', code: 'model_not_found' } },
          404,
        ),
      )

      try {
        await client.chat.completions.create({
          model: 'nonexistent',
          messages: [{ role: 'user', content: 'Hi' }],
        })
        expect.unreachable('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(RavenError)
        const ravenError = error as InstanceType<typeof RavenError>
        expect(ravenError.status).toBe(404)
        expect(ravenError.code).toBe('model_not_found')
        expect(ravenError.message).toBe('Model not found')
      }
    })

    it('should handle non-JSON error responses', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response('Internal Server Error', {
          status: 500,
          statusText: 'Internal Server Error',
        }),
      )

      // With default retries, it'll retry 3 times on 500
      mockFetch.mockResolvedValueOnce(
        new Response('Internal Server Error', {
          status: 500,
          statusText: 'Internal Server Error',
        }),
      )
      mockFetch.mockResolvedValueOnce(
        new Response('Internal Server Error', {
          status: 500,
          statusText: 'Internal Server Error',
        }),
      )
      mockFetch.mockResolvedValueOnce(
        new Response('Internal Server Error', {
          status: 500,
          statusText: 'Internal Server Error',
        }),
      )

      try {
        await client.models.list()
        expect.unreachable('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(RavenError)
        const ravenError = error as InstanceType<typeof RavenError>
        expect(ravenError.status).toBe(500)
        expect(ravenError.message).toBe('Internal Server Error')
      }
    })

    it('should handle timeout errors', async () => {
      const fastClient = new Raven({
        baseUrl: 'https://gateway.example.com',
        apiKey: 'test-key',
        timeout: 1,
        maxRetries: 0,
      })

      mockFetch.mockImplementation(
        (_url: string, init: RequestInit) =>
          new Promise((resolve, reject) => {
            const timer = setTimeout(() => resolve(jsonResponse({ object: 'list', data: [] })), 5000)
            init.signal?.addEventListener('abort', () => {
              clearTimeout(timer)
              reject(new DOMException('The operation was aborted', 'AbortError'))
            })
          }),
      )

      try {
        await fastClient.models.list()
        expect.unreachable('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(RavenError)
        const ravenError = error as InstanceType<typeof RavenError>
        expect(ravenError.code).toBe('timeout')
      }
    })
  })

  describe('interceptors', () => {
    it('should call request interceptors', async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ object: 'list', data: [] }),
      )

      const interceptor = vi.fn((url: string, init: RequestInit) => ({
        ...init,
        headers: {
          ...(init.headers as Record<string, string>),
          'X-Intercepted': 'true',
        },
      }))

      client.onRequest(interceptor)
      await client.models.list()

      expect(interceptor).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Intercepted': 'true',
          }),
        }),
      )
    })

    it('should call response interceptors', async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ object: 'list', data: [] }),
      )

      const interceptor = vi.fn((response: Response) => response)

      client.onResponse(interceptor)
      await client.models.list()

      expect(interceptor).toHaveBeenCalledTimes(1)
    })
  })

  describe('admin API', () => {
    it('should list orgs', async () => {
      const response = {
        data: [{ id: 'org-1', name: 'Test Org', slug: 'test-org' }],
        meta: { total: 1, page: 1, per_page: 20, has_more: false },
      }

      mockFetch.mockResolvedValueOnce(jsonResponse(response))

      const result = await client.admin.orgs.list()

      expect(result.data).toHaveLength(1)
      expect(result.data[0]?.name).toBe('Test Org')
      expect(mockFetch).toHaveBeenCalledWith(
        'https://gateway.example.com/admin/orgs',
        expect.objectContaining({}),
      )
    })

    it('should create an org', async () => {
      const response = {
        data: { id: 'org-1', name: 'New Org', slug: 'new-org' },
      }

      mockFetch.mockResolvedValueOnce(jsonResponse(response))

      const result = await client.admin.orgs.create({ name: 'New Org' })

      expect(result.data.name).toBe('New Org')
      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect(init.method).toBe('POST')
      expect(JSON.parse(init.body as string)).toEqual({ name: 'New Org' })
    })

    it('should get an org by id', async () => {
      const response = {
        data: { id: 'org-1', name: 'Test Org', slug: 'test-org' },
      }

      mockFetch.mockResolvedValueOnce(jsonResponse(response))

      const result = await client.admin.orgs.get('org-1')

      expect(result.data.id).toBe('org-1')
      expect(mockFetch).toHaveBeenCalledWith(
        'https://gateway.example.com/admin/orgs/org-1',
        expect.objectContaining({}),
      )
    })

    it('should update an org', async () => {
      const response = {
        data: { id: 'org-1', name: 'Updated Org', slug: 'test-org' },
      }

      mockFetch.mockResolvedValueOnce(jsonResponse(response))

      const result = await client.admin.orgs.update('org-1', { name: 'Updated Org' })

      expect(result.data.name).toBe('Updated Org')
      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect(init.method).toBe('PATCH')
    })

    it('should delete an org', async () => {
      mockFetch.mockResolvedValueOnce(new Response(null, { status: 204 }))

      await client.admin.orgs.delete('org-1')

      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect(url).toBe('https://gateway.example.com/admin/orgs/org-1')
      expect(init.method).toBe('DELETE')
    })

    it('should list with pagination params', async () => {
      const response = {
        data: [],
        meta: { total: 0, page: 2, per_page: 10, has_more: false },
      }

      mockFetch.mockResolvedValueOnce(jsonResponse(response))

      await client.admin.teams.list({ page: 2, per_page: 10 })

      expect(mockFetch).toHaveBeenCalledWith(
        'https://gateway.example.com/admin/teams?page=2&per_page=10',
        expect.objectContaining({}),
      )
    })

    it('should revoke a key', async () => {
      mockFetch.mockResolvedValueOnce(new Response(null, { status: 204 }))

      await client.admin.keys.revoke('key-1')

      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect(url).toBe('https://gateway.example.com/admin/keys/key-1/revoke')
      expect(init.method).toBe('POST')
    })

    it('should query analytics', async () => {
      const response = {
        data: {
          data: [],
          summary: {
            total_requests: 100,
            total_cost_usd: 1.5,
            total_input_tokens: 5000,
            total_output_tokens: 3000,
            avg_latency_ms: 250,
          },
        },
      }

      mockFetch.mockResolvedValueOnce(jsonResponse(response))

      const result = await client.admin.analytics.query({
        start_date: '2025-01-01',
        end_date: '2025-01-31',
        group_by: 'day',
      })

      expect(result.data.summary.total_requests).toBe(100)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/analytics?'),
        expect.objectContaining({}),
      )
    })

    it('should list providers', async () => {
      const response = {
        data: [
          {
            id: 'openai',
            name: 'openai',
            display_name: 'OpenAI',
            is_configured: true,
            is_healthy: true,
            models: ['gpt-4o'],
          },
        ],
      }

      mockFetch.mockResolvedValueOnce(jsonResponse(response))

      const result = await client.admin.providers.list()

      expect(result.data).toHaveLength(1)
    })

    it('should check provider health', async () => {
      const response = {
        data: { is_healthy: true, latency_ms: 50 },
      }

      mockFetch.mockResolvedValueOnce(jsonResponse(response))

      const result = await client.admin.providers.health('openai')

      expect(result.data.is_healthy).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://gateway.example.com/admin/providers/openai/health',
        expect.objectContaining({}),
      )
    })

    it('should list logs', async () => {
      const response = {
        data: [
          {
            id: 'log-1',
            timestamp: '2025-01-01T00:00:00Z',
            provider: 'openai',
            model: 'gpt-4o',
            input_tokens: 100,
            output_tokens: 50,
            cost_usd: 0.01,
            latency_ms: 200,
            status_code: 200,
            cache_status: 'miss',
          },
        ],
        meta: { total: 1, page: 1, per_page: 20, has_more: false },
      }

      mockFetch.mockResolvedValueOnce(jsonResponse(response))

      const result = await client.admin.logs.list()

      expect(result.data).toHaveLength(1)
      expect(result.data[0]?.provider).toBe('openai')
    })
  })
})
