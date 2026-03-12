import { createHash } from 'node:crypto'
import type { Env } from '@raven/config'
import type { Database } from '@raven/db'
import { providerConfigs, requestLogs, virtualKeys } from '@raven/db'
import { and, eq } from 'drizzle-orm'
import type { Context } from 'hono'
import type { Redis } from 'ioredis'
import { decrypt } from '../../lib/crypto.js'
import { RateLimitError, UnauthorizedError } from '../../lib/errors.js'
import { getProviderAdapter } from './providers/registry.js'

const hashKey = (key: string): string => createHash('sha256').update(key).digest('hex')

const checkRateLimit = async (
  redis: Redis,
  keyId: string,
  rateLimitRpm: number | null,
  rateLimitRpd: number | null,
): Promise<void> => {
  const now = Date.now()

  if (rateLimitRpm !== null) {
    const rpmKey = `rl:rpm:${keyId}`
    const windowStart = now - 60_000
    const pipeline = redis.pipeline()
    pipeline.zremrangebyscore(rpmKey, '-inf', windowStart)
    pipeline.zadd(rpmKey, now, `${now}-${Math.random()}`)
    pipeline.zcard(rpmKey)
    pipeline.expire(rpmKey, 60)
    const results = await pipeline.exec()
    const count = (results?.[2]?.[1] as number) ?? 0
    if (count > rateLimitRpm) {
      throw new RateLimitError('Rate limit exceeded (requests per minute)')
    }
  }

  if (rateLimitRpd !== null) {
    const rpdKey = `rl:rpd:${keyId}`
    const dayStart = now - 86_400_000
    const pipeline = redis.pipeline()
    pipeline.zremrangebyscore(rpdKey, '-inf', dayStart)
    pipeline.zadd(rpdKey, now, `${now}-${Math.random()}`)
    pipeline.zcard(rpdKey)
    pipeline.expire(rpdKey, 86400)
    const results = await pipeline.exec()
    const count = (results?.[2]?.[1] as number) ?? 0
    if (count > rateLimitRpd) {
      throw new RateLimitError('Rate limit exceeded (requests per day)')
    }
  }
}

const extractTokenUsage = (
  body: Record<string, unknown>,
): { inputTokens: number; outputTokens: number } => {
  const usage = body.usage as Record<string, unknown> | undefined
  if (!usage) return { inputTokens: 0, outputTokens: 0 }

  // OpenAI format: prompt_tokens / completion_tokens
  // Anthropic format: input_tokens / output_tokens
  const inputTokens = (usage.input_tokens as number) ?? (usage.prompt_tokens as number) ?? 0
  const outputTokens = (usage.output_tokens as number) ?? (usage.completion_tokens as number) ?? 0

  return { inputTokens, outputTokens }
}

const extractModel = (body: Record<string, unknown>, fallback: string): string => {
  return (body.model as string) ?? fallback
}

const logRequest = async (
  db: Database,
  data: {
    organizationId: string
    virtualKeyId: string
    provider: string
    model: string
    method: string
    path: string
    statusCode: number
    inputTokens: number
    outputTokens: number
    cost: number
    latencyMs: number
    cacheHit: boolean
  },
): Promise<void> => {
  try {
    await db.insert(requestLogs).values({
      organizationId: data.organizationId,
      virtualKeyId: data.virtualKeyId,
      provider: data.provider,
      model: data.model,
      method: data.method,
      path: data.path,
      statusCode: data.statusCode,
      inputTokens: data.inputTokens,
      outputTokens: data.outputTokens,
      cachedTokens: 0,
      cost: data.cost.toFixed(6),
      latencyMs: data.latencyMs,
      cacheHit: data.cacheHit,
    })
  } catch (err) {
    console.error('Failed to log request:', err)
  }
}

export const proxyHandler = (
  db: Database,
  redis: Redis,
  env: Env,
): ((c: Context) => Promise<Response>) => {
  return async (c: Context): Promise<Response> => {
    const startTime = Date.now()

    // 1. Extract virtual key from Authorization header
    const authHeader = c.req.header('Authorization') ?? ''
    const match = authHeader.match(/^Bearer (rk_(?:live|test)_.+)$/)
    if (!match) {
      throw new UnauthorizedError('Missing or invalid Authorization header')
    }
    const rawKey = match[1] as string
    const keyHash = hashKey(rawKey)

    // 2. Look up virtual key by SHA-256 hash
    const [vKey] = await db
      .select()
      .from(virtualKeys)
      .where(eq(virtualKeys.keyHash, keyHash))
      .limit(1)

    if (!vKey) {
      throw new UnauthorizedError('Invalid virtual key')
    }

    // 3. Verify key is active and not expired
    if (!vKey.isActive) {
      throw new UnauthorizedError('Virtual key is inactive')
    }

    if (vKey.expiresAt && vKey.expiresAt < new Date()) {
      throw new UnauthorizedError('Virtual key has expired')
    }

    // 4. Rate limit check
    await checkRateLimit(redis, vKey.id, vKey.rateLimitRpm, vKey.rateLimitRpd)

    // 5. Get provider config for the org
    // Determine provider from request path: /v1/proxy/{provider}/...
    const reqPath = c.req.path
    // Path format: /v1/proxy/{provider}/rest
    const pathSegments = reqPath.replace(/^\/v1\/proxy\/?/, '').split('/')
    const providerName = pathSegments[0]

    if (!providerName) {
      return c.json({ code: 'BAD_REQUEST', message: 'Provider not specified in path' }, 400)
    }

    const [providerConfig] = await db
      .select()
      .from(providerConfigs)
      .where(
        and(
          eq(providerConfigs.organizationId, vKey.organizationId),
          eq(providerConfigs.provider, providerName),
        ),
      )
      .limit(1)

    if (!providerConfig) {
      return c.json(
        { code: 'NOT_FOUND', message: `No provider config found for '${providerName}'` },
        404,
      )
    }

    if (!providerConfig.isEnabled) {
      return c.json({ code: 'FORBIDDEN', message: `Provider '${providerName}' is disabled` }, 403)
    }

    // 6. Decrypt API key and get adapter
    const adapter = getProviderAdapter(providerName)
    const decryptedApiKey = (() => {
      try {
        return decrypt(providerConfig.apiKey, env.ENCRYPTION_SECRET)
      } catch {
        return null
      }
    })()

    if (!decryptedApiKey) {
      return c.json(
        { code: 'INTERNAL_ERROR', message: 'Failed to decrypt provider credentials' },
        500,
      )
    }

    // 7. Build upstream URL
    // Strip /v1/proxy/{provider} prefix, keep the rest
    const upstreamPath = `/${pathSegments.slice(1).join('/')}`
    const rawUrl = c.req.url
    const queryString = rawUrl.includes('?') ? rawUrl.split('?').slice(1).join('?') : ''
    const upstreamUrl = `${adapter.baseUrl}${upstreamPath}${queryString ? `?${queryString}` : ''}`

    // Build forwarded headers (strip hop-by-hop and internal headers)
    const incomingHeaders = Object.fromEntries(
      Object.entries(c.req.header()).filter(
        ([k]) =>
          !['authorization', 'host', 'connection', 'transfer-encoding'].includes(k.toLowerCase()),
      ),
    )

    const upstreamHeaders = adapter.transformHeaders(decryptedApiKey, incomingHeaders)

    // Get request body
    const method = c.req.method
    const hasBody = method !== 'GET' && method !== 'HEAD'
    let bodyText: string | undefined
    let requestBody: Record<string, unknown> = {}

    if (hasBody) {
      bodyText = await c.req.text()
      try {
        requestBody = JSON.parse(bodyText)
      } catch {
        requestBody = {}
      }
    }

    const requestedModel = (requestBody.model as string) ?? 'unknown'
    const isStreaming = requestBody.stream === true

    // 8. Forward request to provider
    const upstreamResponse = await fetch(upstreamUrl, {
      method,
      headers: upstreamHeaders,
      body: hasBody ? bodyText : undefined,
    })

    const latencyMs = Date.now() - startTime

    // 9. Handle streaming vs non-streaming
    if (isStreaming && upstreamResponse.body) {
      // SSE passthrough — stream directly to client
      const responseHeaders: Record<string, string> = {}
      upstreamResponse.headers.forEach((value, key) => {
        if (
          !['connection', 'transfer-encoding', 'content-encoding', 'content-length'].includes(
            key.toLowerCase(),
          )
        ) {
          responseHeaders[key] = value
        }
      })

      // Fire-and-forget log for streaming (no token counts available synchronously)
      void logRequest(db, {
        organizationId: vKey.organizationId,
        virtualKeyId: vKey.id,
        provider: providerName,
        model: requestedModel,
        method,
        path: upstreamPath,
        statusCode: upstreamResponse.status,
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        latencyMs,
        cacheHit: false,
      })

      // Update lastUsedAt async
      db.update(virtualKeys)
        .set({ lastUsedAt: new Date() })
        .where(eq(virtualKeys.id, vKey.id))
        .catch((err) => console.error('Failed to update lastUsedAt:', err))

      return new Response(upstreamResponse.body, {
        status: upstreamResponse.status,
        headers: responseHeaders,
      })
    }

    // Non-streaming: buffer response
    const responseText = await upstreamResponse.text()
    let responseBody: Record<string, unknown> = {}
    try {
      responseBody = JSON.parse(responseText)
    } catch {
      responseBody = {}
    }

    const { inputTokens, outputTokens } = extractTokenUsage(responseBody)
    const model = extractModel(responseBody, requestedModel)
    const cost = adapter.estimateCost(model, inputTokens, outputTokens)

    // 10. Log request async (non-blocking)
    void logRequest(db, {
      organizationId: vKey.organizationId,
      virtualKeyId: vKey.id,
      provider: providerName,
      model,
      method,
      path: upstreamPath,
      statusCode: upstreamResponse.status,
      inputTokens,
      outputTokens,
      cost,
      latencyMs,
      cacheHit: false,
    })

    // Update lastUsedAt async
    db.update(virtualKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(virtualKeys.id, vKey.id))
      .catch((err) => console.error('Failed to update lastUsedAt:', err))

    const responseHeaders: Record<string, string> = {}
    upstreamResponse.headers.forEach((value, key) => {
      if (
        !['connection', 'transfer-encoding', 'content-encoding', 'content-length'].includes(
          key.toLowerCase(),
        )
      ) {
        responseHeaders[key] = value
      }
    })

    return new Response(responseText, {
      status: upstreamResponse.status,
      headers: responseHeaders,
    })
  }
}
