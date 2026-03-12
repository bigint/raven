'use client'

import { cn } from '@/lib/utils'
import { Check, Copy } from 'lucide-react'
import { type ReactNode, useState } from 'react'

interface Tab {
  readonly label: string
  readonly code: string
  readonly highlighted: ReactNode
}

interface HighlightProps {
  readonly code: string
}

interface CodeLine {
  readonly key: string
  readonly text: string
}

interface CodeToken {
  readonly key: string
  readonly value: string
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

const splitCodeLines = (code: string): readonly CodeLine[] => {
  let offset = 0

  return code.split('\n').map((text) => {
    const line = { key: `${offset}:${text.slice(0, 16)}`, text }
    offset += text.length + 1
    return line
  })
}

const tokenizeLine = (line: string, pattern: RegExp): readonly CodeToken[] => {
  let offset = 0

  return line
    .split(pattern)
    .filter((part) => part.length > 0)
    .map((value) => {
      const token = { key: `${offset}:${value}`, value }
      offset += value.length
      return token
    })
}

const renderToken = (key: string, value: string, className?: string) => {
  return (
    <span key={key} className={className}>
      {value}
    </span>
  )
}

const HighlightBash = ({ code }: HighlightProps) => {
  return (
    <>
      {splitCodeLines(code).map((line) => (
        <div key={line.key}>
          {tokenizeLine(line.text, /(\s+|[|\\]|https?:\/\/\S+|-\w+|--\w[\w-]*)/).map((token) => {
            const key = `${line.key}-${token.key}`

            if (/^https?:\/\//.test(token.value)) {
              return renderToken(key, token.value, 'token-url')
            }

            if (/^-/.test(token.value) && token.value.length > 1) {
              return renderToken(key, token.value, 'token-flag')
            }

            if (token.value === '\\' || token.value === '|') {
              return renderToken(key, token.value, 'token-operator')
            }

            return renderToken(key, token.value)
          })}
        </div>
      ))}
    </>
  )
}

const HighlightTS = ({ code }: HighlightProps) => {
  const keywords = ['import', 'from', 'const', 'await', 'new']

  return (
    <>
      {splitCodeLines(code).map((line) => (
        <div key={line.key}>
          {tokenizeLine(
            line.text,
            /('[^']*'|"[^"]*"|\b(?:import|from|const|await|new)\b|[{}(),.:[\]]|\s+)/,
          ).map((token) => {
            const key = `${line.key}-${token.key}`

            if (/^['"]/.test(token.value)) {
              return renderToken(key, token.value, 'token-string')
            }

            if (keywords.includes(token.value)) {
              return renderToken(key, token.value, 'token-keyword')
            }

            if (/^[{}(),.:[\]]$/.test(token.value)) {
              return renderToken(key, token.value, 'token-punctuation')
            }

            return renderToken(key, token.value)
          })}
        </div>
      ))}
    </>
  )
}

const HighlightPython = ({ code }: HighlightProps) => {
  const keywords = ['from', 'import']

  return (
    <>
      {splitCodeLines(code).map((line) => (
        <div key={line.key}>
          {tokenizeLine(line.text, /("[^"]*"|\b(?:from|import)\b|[{}(),.:[\]=]|\s+)/).map(
            (token) => {
              const key = `${line.key}-${token.key}`

              if (/^"/.test(token.value)) {
                return renderToken(key, token.value, 'token-string')
              }

              if (keywords.includes(token.value)) {
                return renderToken(key, token.value, 'token-keyword')
              }

              if (/^[{}(),.:[\]=]$/.test(token.value)) {
                return renderToken(key, token.value, 'token-punctuation')
              }

              return renderToken(key, token.value)
            },
          )}
        </div>
      ))}
    </>
  )
}

const HighlightCurl = ({ code }: HighlightProps) => {
  return (
    <>
      {splitCodeLines(code).map((line) => (
        <div key={line.key}>
          {tokenizeLine(line.text, /("[^"]*"|'[^']*'|https?:\/\/\S+|-\w+|\\|\s+)/).map((token) => {
            const key = `${line.key}-${token.key}`

            if (/^["']/.test(token.value)) {
              return renderToken(key, token.value, 'token-string')
            }

            if (/^https?:\/\//.test(token.value)) {
              return renderToken(key, token.value, 'token-url')
            }

            if (/^-/.test(token.value) && token.value.length > 1) {
              return renderToken(key, token.value, 'token-flag')
            }

            if (token.value === '\\') {
              return renderToken(key, token.value, 'token-operator')
            }

            return renderToken(key, token.value)
          })}
        </div>
      ))}
    </>
  )
}

const tabs: Tab[] = [
  {
    label: 'Quick Start',
    code: quickStartCode,
    highlighted: <HighlightBash code={quickStartCode} />,
  },
  {
    label: 'TypeScript',
    code: typescriptCode,
    highlighted: <HighlightTS code={typescriptCode} />,
  },
  {
    label: 'Python',
    code: pythonCode,
    highlighted: <HighlightPython code={pythonCode} />,
  },
  {
    label: 'curl',
    code: curlCode,
    highlighted: <HighlightCurl code={curlCode} />,
  },
]

export const CodeExample = () => {
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
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
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
