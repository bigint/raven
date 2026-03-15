export interface ProviderConfig {
  label: string;
  baseUrl: string;
  /** Endpoint to hit for key validation (GET unless validationMethod is set) */
  validationPath: string;
  validationMethod?: "POST";
  validationBody?: string;
  authHeaders: (apiKey: string) => Record<string, string>;
}

export const PROVIDERS: Record<string, ProviderConfig> = {
  anthropic: {
    authHeaders: (apiKey) => ({
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
      "x-api-key": apiKey
    }),
    baseUrl: "https://api.anthropic.com/v1",
    label: "Anthropic",
    validationBody: JSON.stringify({
      max_tokens: 1,
      messages: [{ content: "hi", role: "user" }],
      model: "claude-sonnet-4-20250514"
    }),
    validationMethod: "POST",
    validationPath: "/messages"
  },
  cerebras: {
    authHeaders: (apiKey) => ({ Authorization: `Bearer ${apiKey}` }),
    baseUrl: "https://api.cerebras.ai/v1",
    label: "Cerebras",
    validationPath: "/models"
  },
  deepseek: {
    authHeaders: (apiKey) => ({ Authorization: `Bearer ${apiKey}` }),
    baseUrl: "https://api.deepseek.com/v1",
    label: "DeepSeek",
    validationPath: "/models"
  },
  fireworks: {
    authHeaders: (apiKey) => ({ Authorization: `Bearer ${apiKey}` }),
    baseUrl: "https://api.fireworks.ai/inference/v1",
    label: "Fireworks AI",
    validationPath: "/models"
  },
  groq: {
    authHeaders: (apiKey) => ({ Authorization: `Bearer ${apiKey}` }),
    baseUrl: "https://api.groq.com/openai/v1",
    label: "Groq",
    validationPath: "/models"
  },
  mistralai: {
    authHeaders: (apiKey) => ({ Authorization: `Bearer ${apiKey}` }),
    baseUrl: "https://api.mistral.ai/v1",
    label: "Mistral AI",
    validationPath: "/models"
  },
  openai: {
    authHeaders: (apiKey) => ({ Authorization: `Bearer ${apiKey}` }),
    baseUrl: "https://api.openai.com/v1",
    label: "OpenAI",
    validationPath: "/models"
  },
  perplexity: {
    authHeaders: (apiKey) => ({ Authorization: `Bearer ${apiKey}` }),
    baseUrl: "https://api.perplexity.ai",
    label: "Perplexity",
    validationPath: "/models"
  },
  sambanova: {
    authHeaders: (apiKey) => ({ Authorization: `Bearer ${apiKey}` }),
    baseUrl: "https://api.sambanova.ai/v1",
    label: "SambaNova",
    validationPath: "/models"
  },
  together: {
    authHeaders: (apiKey) => ({ Authorization: `Bearer ${apiKey}` }),
    baseUrl: "https://api.together.xyz/v1",
    label: "Together AI",
    validationPath: "/models"
  },
  "x-ai": {
    authHeaders: (apiKey) => ({ Authorization: `Bearer ${apiKey}` }),
    baseUrl: "https://api.x.ai/v1",
    label: "xAI",
    validationPath: "/models"
  }
};

export const getProviderConfig = (
  provider: string
): ProviderConfig | undefined => PROVIDERS[provider];
