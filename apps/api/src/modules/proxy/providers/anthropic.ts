import type { ProviderAdapter } from './registry.js'

const PRICING: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-20250514': { input: 3, output: 15 },
}

export const anthropicAdapter: ProviderAdapter = {
  name: 'anthropic',
  baseUrl: 'https://api.anthropic.com/v1',

  transformHeaders(apiKey, headers) {
    return {
      ...headers,
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    }
  },

  estimateCost(model, inputTokens, outputTokens) {
    const pricing = PRICING[model] ?? { input: 3, output: 15 }
    const inputCost = (inputTokens / 1_000_000) * pricing.input
    const outputCost = (outputTokens / 1_000_000) * pricing.output
    return inputCost + outputCost
  },
}
