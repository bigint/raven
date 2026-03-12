import { PROVIDERS } from '../../../lib/providers.js'
import type { ProviderAdapter } from './registry.js'

const config = PROVIDERS.openai!

const PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 2.5, output: 10 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
}

export const openaiAdapter: ProviderAdapter = {
  name: 'openai',
  baseUrl: config.baseUrl,

  transformHeaders(apiKey, headers) {
    return {
      ...headers,
      ...config.authHeaders(apiKey),
    }
  },

  estimateCost(model, inputTokens, outputTokens) {
    const pricing = PRICING[model] ?? { input: 2.5, output: 10 }
    const inputCost = (inputTokens / 1_000_000) * pricing.input
    const outputCost = (outputTokens / 1_000_000) * pricing.output
    return inputCost + outputCost
  },
}
