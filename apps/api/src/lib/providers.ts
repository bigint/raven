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

const bearerAuth = (apiKey: string): Record<string, string> => ({
  Authorization: `Bearer ${apiKey}`
});

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
  google: {
    authHeaders: bearerAuth,
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    chatEndpoint: "/chat/completions",
    label: "Google",
    modelsEndpoint: "/models",
    validationPath: "/models"
  },
  openai: {
    authHeaders: bearerAuth,
    baseUrl: "https://api.openai.com/v1",
    chatEndpoint: "/chat/completions",
    label: "OpenAI",
    modelsEndpoint: "/models",
    validationPath: "/models"
  }
};

export const getProviderConfig = (
  provider: string
): ProviderConfig | undefined => PROVIDERS[provider];
