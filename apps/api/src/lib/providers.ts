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
  azure: {
    authHeaders: (apiKey) => ({ Authorization: `Bearer ${apiKey}` }),
    baseUrl: "https://management.azure.com",
    label: "Azure",
    validationPath:
      "/providers/Microsoft.CognitiveServices?api-version=2021-04-01"
  },
  cohere: {
    authHeaders: (apiKey) => ({ Authorization: `Bearer ${apiKey}` }),
    baseUrl: "https://api.cohere.com/v2",
    label: "Cohere",
    validationPath: "/models"
  },
  google: {
    authHeaders: (apiKey) => ({ "x-goog-api-key": apiKey }),
    baseUrl: "https://generativelanguage.googleapis.com/v1",
    label: "Google",
    validationPath: "/models"
  },
  mistral: {
    authHeaders: (apiKey) => ({ Authorization: `Bearer ${apiKey}` }),
    baseUrl: "https://api.mistral.ai/v1",
    label: "Mistral",
    validationPath: "/models"
  },
  openai: {
    authHeaders: (apiKey) => ({ Authorization: `Bearer ${apiKey}` }),
    baseUrl: "https://api.openai.com/v1",
    label: "OpenAI",
    validationPath: "/models"
  }
};

export const getProviderConfig = (
  provider: string
): ProviderConfig | undefined => PROVIDERS[provider];

export const SUPPORTED_PROVIDERS = Object.keys(PROVIDERS);
