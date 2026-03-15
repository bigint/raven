# Upcoming Providers

Providers removed from the initial release to keep scope focused on OpenAI and Anthropic. To re-add a provider, create the corresponding YAML spec in `gateway/internal/providers/specs/` — the registry auto-discovers all spec files.

## OpenAI-Compatible (use OpenAI adapter)

| Provider | Base URL | Auth |
|----------|----------|------|
| Together AI | `https://api.together.xyz/v1` | Bearer |
| Perplexity | `https://api.perplexity.ai` | Bearer |
| OpenRouter | `https://openrouter.ai/api/v1` | Bearer |
| Fireworks AI | `https://api.fireworks.ai/inference/v1` | Bearer |
| SambaNova | `https://api.sambanova.ai/v1` | Bearer |
| DeepSeek | `https://api.deepseek.com/v1` | Bearer |
| Groq | `https://api.groq.com/openai/v1` | Bearer |
| Cerebras | `https://api.cerebras.ai/v1` | Bearer |
| Ollama | `http://localhost:11434/v1` | None |

## Custom Adapter Required

| Provider | Base URL | Auth | Adapter |
|----------|----------|------|---------|
| Google (Gemini) | `https://generativelanguage.googleapis.com/v1beta` | Query param | GeminiAdapter |
| Cohere | `https://api.cohere.com/v2` | Bearer | CohereAdapter |
| Azure OpenAI | `https://{resource}.openai.azure.com/openai/deployments/{deployment}` | API key header | AzureOpenAIAdapter |
