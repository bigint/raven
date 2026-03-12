interface ProviderItem {
  readonly id: string
  readonly name: string
}

const providers = [
  'OpenAI',
  'Anthropic',
  'Google',
  'Mistral',
  'Cohere',
  'Groq',
  'DeepSeek',
  'Together AI',
  'Fireworks',
  'Perplexity',
  'Ollama',
  'Azure OpenAI',
  'AWS Bedrock',
  'Vertex AI',
  'Cerebras',
  'Sambanova',
  'xAI',
  'OpenRouter',
  'Replicate',
]

const buildProviderCycle = (label: string, names: readonly string[]): readonly ProviderItem[] => {
  return names.map((name) => ({ id: `${label}-${name}`, name }))
}

const forwardProviders = [
  ...buildProviderCycle('forward-1', providers),
  ...buildProviderCycle('forward-2', providers),
]

const reverseProviders = [
  ...buildProviderCycle('reverse-1', [...providers].reverse()),
  ...buildProviderCycle('reverse-2', [...providers].reverse()),
]

const ProviderPill = ({ name }: { readonly name: string }) => {
  return (
    <div className="flex-shrink-0 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-5 py-2.5 text-sm text-muted hover:text-foreground hover:border-primary/30 transition-colors duration-200">
      <span className="w-2 h-2 rounded-full bg-primary-light/50" />
      {name}
    </div>
  )
}

export const ProvidersGrid = () => {
  return (
    <section className="py-24 md:py-32 overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 mb-12">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-4xl md:text-5xl text-foreground">
            50+ providers. One API.
          </h2>
          <p className="mt-4 text-lg text-muted">
            Connect to every major AI provider through a single, unified interface.
          </p>
        </div>
      </div>

      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

        <div className="flex gap-4 animate-marquee" style={{ width: 'max-content' }}>
          {forwardProviders.map((provider) => (
            <ProviderPill key={provider.id} name={provider.name} />
          ))}
        </div>

        <div
          className="flex gap-4 mt-4 animate-marquee"
          style={{ width: 'max-content', animationDirection: 'reverse', animationDuration: '40s' }}
        >
          {reverseProviders.map((provider) => (
            <ProviderPill key={provider.id} name={provider.name} />
          ))}
        </div>
      </div>
    </section>
  )
}
