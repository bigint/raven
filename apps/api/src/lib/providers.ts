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
  ai21: {
    authHeaders: bearerAuth,
    baseUrl: "https://api.ai21.com/studio/v1",
    chatEndpoint: "/chat/completions",
    label: "AI21 Labs",
    modelsEndpoint: "/models",
    validationPath: "/models"
  },
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
  anyscale: {
    authHeaders: bearerAuth,
    baseUrl: "https://api.endpoints.anyscale.com/v1",
    chatEndpoint: "/chat/completions",
    label: "Anyscale",
    modelsEndpoint: "/models",
    validationPath: "/models"
  },
  "azure-openai": {
    authHeaders: (apiKey) => ({ "api-key": apiKey }),
    baseUrl: "https://placeholder.openai.azure.com/openai",
    chatEndpoint: "/chat/completions",
    label: "Azure OpenAI",
    modelsEndpoint: "/models",
    validationPath: "/models"
  },
  bedrock: {
    authHeaders: bearerAuth,
    baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
    chatEndpoint: "/model/invoke",
    label: "AWS Bedrock",
    modelsEndpoint: "/models",
    validationPath: "/models"
  },
  cerebras: {
    authHeaders: bearerAuth,
    baseUrl: "https://api.cerebras.ai/v1",
    chatEndpoint: "/chat/completions",
    label: "Cerebras",
    modelsEndpoint: "/models",
    validationPath: "/models"
  },
  cloudflare: {
    authHeaders: bearerAuth,
    baseUrl: "https://api.cloudflare.com/client/v4/accounts",
    chatEndpoint: "/chat/completions",
    label: "Cloudflare Workers AI",
    modelsEndpoint: "/models",
    validationPath: "/models"
  },
  cohere: {
    authHeaders: bearerAuth,
    baseUrl: "https://api.cohere.com/v2",
    chatEndpoint: "/chat",
    label: "Cohere",
    modelsEndpoint: "/models",
    validationPath: "/models"
  },
  databricks: {
    authHeaders: bearerAuth,
    baseUrl: "https://dbc-placeholder.cloud.databricks.com/serving-endpoints",
    chatEndpoint: "/chat/completions",
    label: "Databricks",
    modelsEndpoint: "/models",
    validationPath: "/models"
  },
  deepinfra: {
    authHeaders: bearerAuth,
    baseUrl: "https://api.deepinfra.com/v1/openai",
    chatEndpoint: "/chat/completions",
    label: "DeepInfra",
    modelsEndpoint: "/models",
    validationPath: "/models"
  },
  deepseek: {
    authHeaders: bearerAuth,
    baseUrl: "https://api.deepseek.com/v1",
    chatEndpoint: "/chat/completions",
    label: "DeepSeek",
    modelsEndpoint: "/models",
    validationPath: "/models"
  },
  fireworks: {
    authHeaders: bearerAuth,
    baseUrl: "https://api.fireworks.ai/inference/v1",
    chatEndpoint: "/chat/completions",
    label: "Fireworks AI",
    modelsEndpoint: "/models",
    validationPath: "/models"
  },
  google: {
    authHeaders: bearerAuth,
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    chatEndpoint: "/chat/completions",
    label: "Google AI Studio",
    modelsEndpoint: "/models",
    validationPath: "/models"
  },
  groq: {
    authHeaders: bearerAuth,
    baseUrl: "https://api.groq.com/openai/v1",
    chatEndpoint: "/chat/completions",
    label: "Groq",
    modelsEndpoint: "/models",
    validationPath: "/models"
  },
  huggingface: {
    authHeaders: bearerAuth,
    baseUrl: "https://api-inference.huggingface.co/v1",
    chatEndpoint: "/chat/completions",
    label: "HuggingFace",
    modelsEndpoint: "/models",
    validationPath: "/models"
  },
  lepton: {
    authHeaders: bearerAuth,
    baseUrl: "https://api.lepton.ai/v1",
    chatEndpoint: "/chat/completions",
    label: "Lepton AI",
    modelsEndpoint: "/models",
    validationPath: "/models"
  },
  mistralai: {
    authHeaders: bearerAuth,
    baseUrl: "https://api.mistral.ai/v1",
    chatEndpoint: "/chat/completions",
    label: "Mistral AI",
    modelsEndpoint: "/models",
    validationPath: "/models"
  },
  modal: {
    authHeaders: bearerAuth,
    baseUrl: "https://api.modal.com/v1",
    chatEndpoint: "/chat/completions",
    label: "Modal",
    modelsEndpoint: "/models",
    validationPath: "/models"
  },
  novita: {
    authHeaders: bearerAuth,
    baseUrl: "https://api.novita.ai/v3/openai",
    chatEndpoint: "/chat/completions",
    label: "Novita AI",
    modelsEndpoint: "/models",
    validationPath: "/models"
  },
  nvidia: {
    authHeaders: bearerAuth,
    baseUrl: "https://integrate.api.nvidia.com/v1",
    chatEndpoint: "/chat/completions",
    label: "NVIDIA NIM",
    modelsEndpoint: "/models",
    validationPath: "/models"
  },
  ollama: {
    authHeaders: () => ({}),
    baseUrl: "http://localhost:11434/v1",
    chatEndpoint: "/chat/completions",
    label: "Ollama",
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
  },
  perplexity: {
    authHeaders: bearerAuth,
    baseUrl: "https://api.perplexity.ai",
    chatEndpoint: "/chat/completions",
    label: "Perplexity",
    modelsEndpoint: "/models",
    validationPath: "/models"
  },
  replicate: {
    authHeaders: bearerAuth,
    baseUrl: "https://api.replicate.com/v1",
    chatEndpoint: "/chat/completions",
    label: "Replicate",
    modelsEndpoint: "/models",
    validationPath: "/models"
  },
  sambanova: {
    authHeaders: bearerAuth,
    baseUrl: "https://api.sambanova.ai/v1",
    chatEndpoint: "/chat/completions",
    label: "SambaNova",
    modelsEndpoint: "/models",
    validationPath: "/models"
  },
  together: {
    authHeaders: bearerAuth,
    baseUrl: "https://api.together.xyz/v1",
    chatEndpoint: "/chat/completions",
    label: "Together AI",
    modelsEndpoint: "/models",
    validationPath: "/models"
  },
  voyage: {
    authHeaders: bearerAuth,
    baseUrl: "https://api.voyageai.com/v1",
    chatEndpoint: "/embeddings",
    label: "Voyage AI",
    modelsEndpoint: "/models",
    validationPath: "/models"
  },
  xai: {
    authHeaders: bearerAuth,
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
