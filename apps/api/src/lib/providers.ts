export interface ProviderConfig {
  label: string
  baseUrl: string
  /** Endpoint to hit for key validation (GET unless validationMethod is set) */
  validationPath: string
  validationMethod?: 'POST'
  validationBody?: string
  authHeaders: (apiKey: string) => Record<string, string>
}

export const PROVIDERS: Record<string, ProviderConfig> = {
  openai: {
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    validationPath: '/models',
    authHeaders: (apiKey) => ({ Authorization: `Bearer ${apiKey}` }),
  },
  anthropic: {
    label: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    validationPath: '/messages',
    validationMethod: 'POST',
    validationBody: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'hi' }],
    }),
    authHeaders: (apiKey) => ({
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    }),
  },
  google: {
    label: 'Google',
    baseUrl: 'https://generativelanguage.googleapis.com/v1',
    validationPath: '/models',
    authHeaders: (apiKey) => ({ 'x-goog-api-key': apiKey }),
  },
  azure: {
    label: 'Azure',
    baseUrl: 'https://management.azure.com',
    validationPath: '/providers/Microsoft.CognitiveServices?api-version=2021-04-01',
    authHeaders: (apiKey) => ({ Authorization: `Bearer ${apiKey}` }),
  },
  cohere: {
    label: 'Cohere',
    baseUrl: 'https://api.cohere.com/v2',
    validationPath: '/models',
    authHeaders: (apiKey) => ({ Authorization: `Bearer ${apiKey}` }),
  },
  mistral: {
    label: 'Mistral',
    baseUrl: 'https://api.mistral.ai/v1',
    validationPath: '/models',
    authHeaders: (apiKey) => ({ Authorization: `Bearer ${apiKey}` }),
  },
}

export const getProviderConfig = (provider: string): ProviderConfig | undefined =>
  PROVIDERS[provider]

export const SUPPORTED_PROVIDERS = Object.keys(PROVIDERS)
