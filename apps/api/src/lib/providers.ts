export interface ProviderConfig {
  label: string;
  baseUrl: string;
  chatEndpoint: string;
  modelsEndpoint: string;
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
    chatEndpoint: "/messages",
    label: "Anthropic",
    modelsEndpoint: "/models?limit=100",
    validationBody: JSON.stringify({
      max_tokens: 1,
      messages: [{ content: "hi", role: "user" }],
      model: "claude-sonnet-4-20250514"
    }),
    validationMethod: "POST",
    validationPath: "/messages"
  },
  mistralai: {
    authHeaders: (apiKey) => ({ Authorization: `Bearer ${apiKey}` }),
    baseUrl: "https://api.mistral.ai/v1",
    chatEndpoint: "/chat/completions",
    label: "Mistral AI",
    modelsEndpoint: "/models",
    validationPath: "/models"
  },
  openai: {
    authHeaders: (apiKey) => ({ Authorization: `Bearer ${apiKey}` }),
    baseUrl: "https://api.openai.com/v1",
    chatEndpoint: "/chat/completions",
    label: "OpenAI",
    modelsEndpoint: "/models",
    validationPath: "/models"
  },
  "x-ai": {
    authHeaders: (apiKey) => ({ Authorization: `Bearer ${apiKey}` }),
    baseUrl: "https://api.x.ai/v1",
    chatEndpoint: "/chat/completions",
    label: "xAI",
    modelsEndpoint: "/models",
    validationPath: "/models"
  }
};

export const getProviderConfig = (
  provider: string
): ProviderConfig | undefined => PROVIDERS[provider];
