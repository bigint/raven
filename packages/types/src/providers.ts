export type Provider = 'openai' | 'anthropic' | 'google'

export interface ModelInfo {
  readonly id: string
  readonly name: string
  readonly provider: Provider
  readonly inputPricePer1m: number
  readonly outputPricePer1m: number
  readonly contextWindow: number
  readonly supportsStreaming: boolean
}

export interface TokenCount {
  readonly inputTokens: number
  readonly outputTokens: number
  readonly cachedTokens: number
}
