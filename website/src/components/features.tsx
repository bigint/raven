'use client'

import { cn } from '@/lib/utils'
import {
  Activity,
  DollarSign,
  Eye,
  Puzzle,
  Server,
  ShieldCheck,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const features = [
  {
    icon: ShieldCheck,
    title: 'Privacy First',
    description: 'Zero telemetry. Fully self-hosted. All data stays local. Forever.',
  },
  {
    icon: Server,
    title: '50+ Providers',
    description:
      'OpenAI, Anthropic, Google, Mistral, Cohere, Groq, and 45 more. One unified API.',
  },
  {
    icon: Activity,
    title: 'Semantic Cache',
    description:
      'Two-tier caching with exact match and vector similarity. Cut costs by up to 90%.',
  },
  {
    icon: DollarSign,
    title: 'Cost Controls',
    description:
      'Per-key budgets, team-level limits, automatic model downgrade. Never get a surprise bill.',
  },
  {
    icon: Eye,
    title: 'Observability',
    description:
      'Every request logged. Token counts, latency, cost attribution. OpenTelemetry export.',
  },
  {
    icon: Puzzle,
    title: 'Plugin Ecosystem',
    description:
      'Extend with Go, WASM, or webhooks. Guardrails, custom auth, trace export.',
  },
]

export function Features() {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 },
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section className="py-24 md:py-32" ref={ref}>
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="font-heading text-4xl md:text-5xl text-foreground">
            Everything you need to manage AI
          </h2>
          <p className="mt-4 text-lg text-muted">
            A complete gateway for routing, caching, and governing LLM traffic.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.title}
                className={cn(
                  'group relative rounded-xl border border-border bg-surface p-8 transition-all duration-500 hover:bg-surface-hover hover:border-primary/30',
                  visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6',
                )}
                style={{ transitionDelay: visible ? `${i * 100}ms` : '0ms' }}
              >
                <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary-light group-hover:bg-primary/20 transition-colors duration-300">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2 font-body">
                  {feature.title}
                </h3>
                <p className="text-muted text-sm leading-relaxed">{feature.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
