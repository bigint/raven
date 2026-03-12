import { Card, CardContent } from '@/components/ui/card'
import { useProviders } from '@/hooks/use-providers'
import { useKeys } from '@/hooks/use-keys'
import { cn } from '@/lib/utils'
import { Check, CheckCircle2, Circle, Copy, ExternalLink } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'

const GATEWAY_URL =
  import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '')

type Tab = 'curl' | 'python' | 'typescript'

const CodeBlock = ({ code, className }: { readonly code: string; readonly className?: string }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [code])

  return (
    <div className={cn('relative group', className)}>
      <button
        type="button"
        onClick={handleCopy}
        className="absolute top-2 right-2 rounded-md border border-border bg-surface p-1.5 text-text-muted hover:text-text-secondary hover:border-border-hover opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      </button>
      <pre className="rounded-md border border-border bg-bg p-3 overflow-x-auto">
        <code className="text-[11px] leading-relaxed font-mono text-text-secondary">{code}</code>
      </pre>
    </div>
  )
}

const StepIndicator = ({
  step,
  done,
  title,
  description,
  action,
}: {
  readonly step: number
  readonly done: boolean
  readonly title: string
  readonly description: string
  readonly action?: { label: string; to: string }
}) => (
  <div className="flex gap-3">
    <div className="flex flex-col items-center">
      <div
        className={cn(
          'size-6 rounded-full flex items-center justify-center shrink-0',
          done ? 'bg-success/10' : 'bg-surface-hover',
        )}
      >
        {done ? (
          <CheckCircle2 className="size-3.5 text-success" />
        ) : (
          <span className="text-[10px] font-medium text-text-muted">{step}</span>
        )}
      </div>
      <div className="w-px flex-1 bg-border mt-1.5" />
    </div>
    <div className="pb-6">
      <p
        className={cn(
          'text-xs font-medium',
          done ? 'text-text-tertiary line-through' : 'text-text-primary',
        )}
      >
        {title}
      </p>
      <p className="text-[11px] text-text-tertiary mt-0.5">{description}</p>
      {action && !done && (
        <Link
          to={action.to}
          className="inline-flex items-center gap-1 mt-2 text-[11px] text-accent hover:underline"
        >
          {action.label}
          <ExternalLink className="size-2.5" />
        </Link>
      )}
    </div>
  </div>
)

const QuickStartPage = () => {
  const { data: providers } = useProviders()
  const { data: keys } = useKeys({ page: 1, per_page: 1 })
  const [activeTab, setActiveTab] = useState<Tab>('curl')

  const hasProvider = providers?.some((p) => p.configured || p.enabled) ?? false
  const hasKey = (keys?.total ?? 0) > 0
  const gatewayUrl = GATEWAY_URL || 'http://localhost:8080'

  const tabs: { id: Tab; label: string }[] = [
    { id: 'curl', label: 'cURL' },
    { id: 'python', label: 'Python' },
    { id: 'typescript', label: 'TypeScript' },
  ]

  const codeExamples: Record<Tab, string> = {
    curl: `curl ${gatewayUrl}/v1/chat/completions \\
  -H "Authorization: Bearer YOUR_VIRTUAL_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4o",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'`,
    python: `from openai import OpenAI

client = OpenAI(
    api_key="YOUR_VIRTUAL_KEY",
    base_url="${gatewayUrl}/v1"
)

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "user", "content": "Hello!"}
    ]
)

print(response.choices[0].message.content)`,
    typescript: `import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: 'YOUR_VIRTUAL_KEY',
  baseURL: '${gatewayUrl}/v1'
})

const response = await client.chat.completions.create({
  model: 'gpt-4o',
  messages: [
    { role: 'user', content: 'Hello!' }
  ]
})

console.log(response.choices[0].message.content)`,
  }

  const streamingExample: Record<Tab, string> = {
    curl: `curl ${gatewayUrl}/v1/chat/completions \\
  -H "Authorization: Bearer YOUR_VIRTUAL_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4o",
    "stream": true,
    "messages": [
      {"role": "user", "content": "Write a haiku"}
    ]
  }'`,
    python: `from openai import OpenAI

client = OpenAI(
    api_key="YOUR_VIRTUAL_KEY",
    base_url="${gatewayUrl}/v1"
)

stream = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Write a haiku"}],
    stream=True
)

for chunk in stream:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="")`,
    typescript: `import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: 'YOUR_VIRTUAL_KEY',
  baseURL: '${gatewayUrl}/v1'
})

const stream = await client.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Write a haiku' }],
  stream: true
})

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '')
}`,
  }

  const anthropicExample: Record<Tab, string> = {
    curl: `# Anthropic models work through the same endpoint
curl ${gatewayUrl}/v1/chat/completions \\
  -H "Authorization: Bearer YOUR_VIRTUAL_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "claude-sonnet-4-20250514",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'`,
    python: `# Anthropic models use the same OpenAI-compatible interface
from openai import OpenAI

client = OpenAI(
    api_key="YOUR_VIRTUAL_KEY",
    base_url="${gatewayUrl}/v1"
)

# Raven automatically routes to Anthropic
response = client.chat.completions.create(
    model="claude-sonnet-4-20250514",
    messages=[
        {"role": "user", "content": "Hello!"}
    ]
)

print(response.choices[0].message.content)`,
    typescript: `// Anthropic models use the same OpenAI-compatible interface
import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: 'YOUR_VIRTUAL_KEY',
  baseURL: '${gatewayUrl}/v1'
})

// Raven automatically routes to Anthropic
const response = await client.chat.completions.create({
  model: 'claude-sonnet-4-20250514',
  messages: [{ role: 'user', content: 'Hello!' }]
})

console.log(response.choices[0].message.content)`,
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-[13px] font-semibold text-text-primary">Quick Start</h1>
        <p className="text-[11px] text-text-tertiary mt-1">
          Get up and running with the Raven gateway in minutes.
        </p>
      </div>

      {/* Setup checklist */}
      <Card>
        <CardContent>
          <p className="text-[9px] font-medium text-text-muted uppercase tracking-[1px] mb-4">
            Setup
          </p>
          <StepIndicator
            step={1}
            done={hasProvider}
            title="Configure a provider"
            description="Add your OpenAI or Anthropic API key to enable model access."
            action={{ label: 'Go to Providers', to: '/providers' }}
          />
          <StepIndicator
            step={2}
            done={hasKey}
            title="Create a virtual key"
            description="Generate a virtual key to authenticate your requests through the gateway."
            action={{ label: 'Go to Keys', to: '/keys' }}
          />
          <div className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'size-6 rounded-full flex items-center justify-center shrink-0',
                  hasProvider && hasKey ? 'bg-success/10' : 'bg-surface-hover',
                )}
              >
                {hasProvider && hasKey ? (
                  <CheckCircle2 className="size-3.5 text-success" />
                ) : (
                  <Circle className="size-3.5 text-text-muted" />
                )}
              </div>
            </div>
            <div>
              <p
                className={cn(
                  'text-xs font-medium',
                  hasProvider && hasKey ? 'text-text-tertiary' : 'text-text-primary',
                )}
              >
                Send your first request
              </p>
              <p className="text-[11px] text-text-tertiary mt-0.5">
                Use any OpenAI-compatible SDK pointed at the gateway.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gateway endpoint */}
      <Card>
        <CardContent>
          <p className="text-[9px] font-medium text-text-muted uppercase tracking-[1px] mb-3">
            Gateway Endpoint
          </p>
          <p className="text-[11px] text-text-tertiary mb-2">
            Point your OpenAI SDK or HTTP client to this base URL:
          </p>
          <CodeBlock code={`${gatewayUrl}/v1`} />
          <p className="text-[11px] text-text-tertiary mt-3">
            Raven is fully compatible with the OpenAI API format. Use your virtual key as the API
            key and the gateway will route requests to the correct provider based on the model name.
          </p>
        </CardContent>
      </Card>

      {/* Code examples */}
      <Card>
        <CardContent>
          <p className="text-[9px] font-medium text-text-muted uppercase tracking-[1px] mb-3">
            Chat Completion
          </p>

          <div className="flex gap-px mb-3 border-b border-border">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'px-3 py-1.5 text-[11px] font-medium border-b-2 -mb-px transition-colors',
                  activeTab === tab.id
                    ? 'border-accent text-text-primary'
                    : 'border-transparent text-text-muted hover:text-text-secondary',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <CodeBlock code={codeExamples[activeTab]} />
        </CardContent>
      </Card>

      {/* Streaming example */}
      <Card>
        <CardContent>
          <p className="text-[9px] font-medium text-text-muted uppercase tracking-[1px] mb-3">
            Streaming
          </p>
          <p className="text-[11px] text-text-tertiary mb-3">
            Raven supports Server-Sent Events (SSE) for streaming responses from all providers.
          </p>

          <div className="flex gap-px mb-3 border-b border-border">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'px-3 py-1.5 text-[11px] font-medium border-b-2 -mb-px transition-colors',
                  activeTab === tab.id
                    ? 'border-accent text-text-primary'
                    : 'border-transparent text-text-muted hover:text-text-secondary',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <CodeBlock code={streamingExample[activeTab]} />
        </CardContent>
      </Card>

      {/* Anthropic example */}
      <Card>
        <CardContent>
          <p className="text-[9px] font-medium text-text-muted uppercase tracking-[1px] mb-3">
            Using Anthropic Models
          </p>
          <p className="text-[11px] text-text-tertiary mb-3">
            Anthropic models are accessed through the same OpenAI-compatible interface. Raven
            automatically translates between formats.
          </p>

          <div className="flex gap-px mb-3 border-b border-border">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'px-3 py-1.5 text-[11px] font-medium border-b-2 -mb-px transition-colors',
                  activeTab === tab.id
                    ? 'border-accent text-text-primary'
                    : 'border-transparent text-text-muted hover:text-text-secondary',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <CodeBlock code={anthropicExample[activeTab]} />
        </CardContent>
      </Card>

      {/* Features */}
      <Card>
        <CardContent>
          <p className="text-[9px] font-medium text-text-muted uppercase tracking-[1px] mb-3">
            What You Get
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                title: 'Unified API',
                desc: 'Single endpoint for OpenAI, Anthropic, and more. Use one SDK for all providers.',
              },
              {
                title: 'Virtual Keys',
                desc: 'Create scoped API keys with budgets, rate limits, and model restrictions.',
              },
              {
                title: 'Cost Tracking',
                desc: 'Real-time cost monitoring per key, team, and organization.',
              },
              {
                title: 'Response Caching',
                desc: 'Automatic caching of identical requests to reduce costs and latency.',
              },
              {
                title: 'Load Balancing',
                desc: 'Distribute requests across providers with automatic failover.',
              },
              {
                title: 'Analytics',
                desc: 'Request logs, latency metrics, and usage analytics in real time.',
              },
            ].map((feature) => (
              <div key={feature.title} className="rounded-md border border-border p-3">
                <p className="text-xs font-medium text-text-primary">{feature.title}</p>
                <p className="text-[11px] text-text-tertiary mt-0.5">{feature.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default QuickStartPage
