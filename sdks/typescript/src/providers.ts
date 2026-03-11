const PROVIDER_PREFIXES: Record<string, string> = {
  anthropic: 'anthropic/',
  openai: 'openai/',
  google: 'google/',
  mistral: 'mistral/',
  cohere: 'cohere/',
  groq: 'groq/',
  together: 'together/',
  fireworks: 'fireworks/',
  perplexity: 'perplexity/',
  deepseek: 'deepseek/',
}

const PROVIDER_MODELS: Record<string, string[]> = {
  anthropic: ['claude-sonnet-4-20250514', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o1', 'o1-mini', 'o3-mini'],
  google: ['gemini-2.0-flash', 'gemini-2.0-pro', 'gemini-1.5-flash', 'gemini-1.5-pro'],
  mistral: ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest'],
  groq: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768'],
  deepseek: ['deepseek-chat', 'deepseek-reasoner'],
}

const EMBEDDING_PROVIDERS = new Set(['openai', 'cohere', 'google', 'mistral'])
const STREAMING_PROVIDERS = new Set([
  'anthropic',
  'openai',
  'google',
  'mistral',
  'cohere',
  'groq',
  'together',
  'fireworks',
  'deepseek',
])
const TOOL_USE_PROVIDERS = new Set(['anthropic', 'openai', 'google', 'mistral', 'groq'])
const VISION_PROVIDERS = new Set(['anthropic', 'openai', 'google'])

/**
 * Ensures a model name has the correct provider prefix.
 * If the model already has a prefix, returns as-is.
 */
export function ensureProviderPrefix(provider: string, model: string): string {
  const prefix = PROVIDER_PREFIXES[provider]
  if (!prefix) {
    return model
  }
  if (model.startsWith(prefix)) {
    return model
  }
  // Check if it already has another provider prefix
  for (const p of Object.values(PROVIDER_PREFIXES)) {
    if (model.startsWith(p)) {
      return model
    }
  }
  return `${prefix}${model}`
}

/**
 * Extracts the provider name from a prefixed model string.
 * Returns undefined if no known prefix is found.
 */
export function extractProvider(model: string): string | undefined {
  for (const [provider, prefix] of Object.entries(PROVIDER_PREFIXES)) {
    if (model.startsWith(prefix)) {
      return provider
    }
  }
  return undefined
}

/**
 * Strips the provider prefix from a model name.
 */
export function stripProviderPrefix(model: string): string {
  for (const prefix of Object.values(PROVIDER_PREFIXES)) {
    if (model.startsWith(prefix)) {
      return model.slice(prefix.length)
    }
  }
  return model
}

/**
 * Returns known models for a given provider.
 */
export function getProviderModels(provider: string): string[] {
  return PROVIDER_MODELS[provider] ?? []
}

/**
 * Checks whether a provider supports embeddings.
 */
export function supportsEmbeddings(provider: string): boolean {
  return EMBEDDING_PROVIDERS.has(provider)
}

/**
 * Checks whether a provider supports streaming.
 */
export function supportsStreaming(provider: string): boolean {
  return STREAMING_PROVIDERS.has(provider)
}

/**
 * Checks whether a provider supports tool use / function calling.
 */
export function supportsToolUse(provider: string): boolean {
  return TOOL_USE_PROVIDERS.has(provider)
}

/**
 * Checks whether a provider supports vision (image inputs).
 */
export function supportsVision(provider: string): boolean {
  return VISION_PROVIDERS.has(provider)
}
