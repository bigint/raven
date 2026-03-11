'use client'

import { cn } from '@/lib/utils'
import { Check, Copy } from 'lucide-react'
import { useState } from 'react'

interface Tab {
  label: string
  language: string
  code: string
  highlighted: React.ReactNode
}

const quickStartCode = `curl -LO https://github.com/bigint-studio/raven/releases/latest/download/raven
chmod +x raven && ./raven serve`

const typescriptCode = `import { Raven } from '@raven-gateway/sdk'

const raven = new Raven({
  baseUrl: 'http://localhost:8080',
  apiKey: 'rk_live_xxxx',
})

const response = await raven.chat.completions.create({
  model: 'anthropic/claude-sonnet-4-20250514',
  messages: [{ role: 'user', content: 'Hello!' }],
})`

const pythonCode = `from raven import Raven

client = Raven(base_url="http://localhost:8080", api_key="rk_live_xxxx")

response = client.chat.completions.create(
    model="anthropic/claude-sonnet-4-20250514",
    messages=[{"role": "user", "content": "Hello!"}],
)`

const curlCode = `curl http://localhost:8080/v1/chat/completions \\
  -H "Authorization: Bearer rk_live_xxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "anthropic/claude-sonnet-4-20250514",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`

function HighlightBash({ code }: { code: string }) {
  return (
    <>
      {code.split('\n').map((line, i) => (
        <div key={`bash-${line.slice(0, 15)}-${i}`}>
          {line.split(/(\s+|[|\\]|https?:\/\/\S+|-\w+|--\w[\w-]*)/).map((part, j) => {
            if (/^https?:\/\//.test(part)) return <span key={`p-${i}-${j}`} className="token-url">{part}</span>
            if (/^-/.test(part) && part.length > 1) return <span key={`p-${i}-${j}`} className="token-flag">{part}</span>
            if (part === '\\' || part === '|') return <span key={`p-${i}-${j}`} className="token-operator">{part}</span>
            return <span key={`p-${i}-${j}`}>{part}</span>
          })}
        </div>
      ))}
    </>
  )
}

function HighlightTS({ code }: { code: string }) {
  const keywords = ['import', 'from', 'const', 'await', 'new']
  return (
    <>
      {code.split('\n').map((line, i) => (
        <div key={`ts-${i}`}>
          {line.split(/('[^']*'|"[^"]*"|\b(?:import|from|const|await|new)\b|[{}(),.:[\]]|\s+)/).map((part, j) => {
            if (/^['"]/.test(part)) return <span key={`p-${i}-${j}`} className="token-string">{part}</span>
            if (keywords.includes(part)) return <span key={`p-${i}-${j}`} className="token-keyword">{part}</span>
            if (/^[{}(),.:[\]]$/.test(part)) return <span key={`p-${i}-${j}`} className="token-punctuation">{part}</span>
            return <span key={`p-${i}-${j}`}>{part}</span>
          })}
        </div>
      ))}
    </>
  )
}

function HighlightPython({ code }: { code: string }) {
  const keywords = ['from', 'import']
  return (
    <>
      {code.split('\n').map((line, i) => (
        <div key={`py-${i}`}>
          {line.split(/("[^"]*"|\b(?:from|import)\b|[{}(),.:[\]=]|\s+)/).map((part, j) => {
            if (/^"/.test(part)) return <span key={`p-${i}-${j}`} className="token-string">{part}</span>
            if (keywords.includes(part)) return <span key={`p-${i}-${j}`} className="token-keyword">{part}</span>
            if (/^[{}(),.:[\]=]$/.test(part)) return <span key={`p-${i}-${j}`} className="token-punctuation">{part}</span>
            return <span key={`p-${i}-${j}`}>{part}</span>
          })}
        </div>
      ))}
    </>
  )
}

function HighlightCurl({ code }: { code: string }) {
  return (
    <>
      {code.split('\n').map((line, i) => (
        <div key={`curl-${i}`}>
          {line.split(/("[^"]*"|'[^']*'|https?:\/\/\S+|-\w+|\\|\s+)/).map((part, j) => {
            if (/^["']/.test(part)) return <span key={`p-${i}-${j}`} className="token-string">{part}</span>
            if (/^https?:\/\//.test(part)) return <span key={`p-${i}-${j}`} className="token-url">{part}</span>
            if (/^-/.test(part) && part.length > 1) return <span key={`p-${i}-${j}`} className="token-flag">{part}</span>
            if (part === '\\') return <span key={`p-${i}-${j}`} className="token-operator">{part}</span>
            return <span key={`p-${i}-${j}`}>{part}</span>
          })}
        </div>
      ))}
    </>
  )
}

const tabs: Tab[] = [
  {
    label: 'Quick Start',
    language: 'bash',
    code: quickStartCode,
    highlighted: <HighlightBash code={quickStartCode} />,
  },
  {
    label: 'TypeScript',
    language: 'typescript',
    code: typescriptCode,
    highlighted: <HighlightTS code={typescriptCode} />,
  },
  {
    label: 'Python',
    language: 'python',
    code: pythonCode,
    highlighted: <HighlightPython code={pythonCode} />,
  },
  {
    label: 'curl',
    language: 'bash',
    code: curlCode,
    highlighted: <HighlightCurl code={curlCode} />,
  },
]

export function CodeExample() {
  const [activeTab, setActiveTab] = useState(0)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(tabs[activeTab].code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="font-heading text-4xl md:text-5xl text-foreground">
            Get started in seconds
          </h2>
          <p className="mt-4 text-lg text-muted">
            Use Raven with any language. Drop-in compatible with OpenAI&apos;s API format.
          </p>
        </div>

        <div className="mx-auto max-w-3xl">
          <div className="rounded-xl border border-border overflow-hidden bg-[#1E1E1E]">
            {/* Tab bar */}
            <div className="flex items-center justify-between border-b border-border bg-[#2D2D2D]">
              <div className="flex">
                {tabs.map((tab, i) => (
                  <button
                    key={tab.label}
                    type="button"
                    onClick={() => {
                      setActiveTab(i)
                      setCopied(false)
                    }}
                    className={cn(
                      'px-5 py-3 text-sm font-medium transition-colors duration-200 border-b-2 cursor-pointer',
                      activeTab === i
                        ? 'text-foreground border-primary-light bg-[#1E1E1E]'
                        : 'text-muted border-transparent hover:text-foreground',
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="mr-3 p-2 text-muted hover:text-foreground transition-colors cursor-pointer"
                title="Copy code"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>

            {/* Code */}
            <pre className="p-6 font-mono text-sm leading-relaxed overflow-x-auto text-foreground">
              <code>{tabs[activeTab].highlighted}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  )
}
