'use client'

import { useRevealOnce } from '@/hooks/use-reveal-once'
import { cn } from '@/lib/utils'
import { Check, Minus, X } from 'lucide-react'

type CellValue = true | false | string

interface ComparisonRow {
  readonly feature: string
  readonly raven: CellValue
  readonly litellm: CellValue
  readonly portkey: CellValue
  readonly cloudflare: CellValue
}

const rows: ComparisonRow[] = [
  {
    feature: 'Open Source',
    raven: 'Apache 2.0',
    litellm: 'MIT',
    portkey: false,
    cloudflare: false,
  },
  {
    feature: 'Self-Hosted',
    raven: true,
    litellm: true,
    portkey: 'Cloud only',
    cloudflare: 'Cloud only',
  },
  { feature: 'Zero Telemetry', raven: true, litellm: false, portkey: false, cloudflare: false },
  { feature: 'Providers', raven: '50+', litellm: '100+', portkey: '20+', cloudflare: '15+' },
  { feature: 'Semantic Cache', raven: true, litellm: false, portkey: true, cloudflare: false },
  { feature: 'Budget Controls', raven: true, litellm: false, portkey: true, cloudflare: false },
  { feature: 'RBAC', raven: true, litellm: false, portkey: true, cloudflare: true },
  { feature: 'Plugin System', raven: true, litellm: false, portkey: false, cloudflare: false },
  { feature: 'Single Binary', raven: true, litellm: false, portkey: 'N/A', cloudflare: 'N/A' },
  { feature: 'SSE Streaming', raven: true, litellm: true, portkey: true, cloudflare: true },
  { feature: 'OpenTelemetry', raven: true, litellm: false, portkey: false, cloudflare: false },
]

const CellContent = ({ value }: { readonly value: CellValue }) => {
  if (value === true) return <Check className="h-5 w-5 text-emerald-400" />
  if (value === false) return <X className="h-5 w-5 text-white/20" />
  if (value === 'N/A') return <Minus className="h-5 w-5 text-white/20" />
  return <span className="text-sm">{value}</span>
}

export const Comparison = () => {
  const { ref, isVisible } = useRevealOnce<HTMLDivElement>()

  return (
    <section className="py-24 md:py-32" ref={ref}>
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="font-heading text-4xl md:text-5xl text-foreground">How Raven Compares</h2>
          <p className="mt-4 text-lg text-muted">
            The only open-source AI gateway with zero telemetry, semantic caching, and a plugin
            system.
          </p>
        </div>

        <div
          className={cn(
            'mx-auto max-w-5xl overflow-x-auto transition-all duration-700',
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0',
          )}
        >
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-4 px-4 text-muted font-medium">Feature</th>
                <th className="text-center py-4 px-4 text-primary-light font-semibold bg-primary/5 rounded-t-lg">
                  Raven
                </th>
                <th className="text-center py-4 px-4 text-muted font-medium">LiteLLM</th>
                <th className="text-center py-4 px-4 text-muted font-medium">Portkey</th>
                <th className="text-center py-4 px-4 text-muted font-medium">Cloudflare</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.feature}
                  className="border-b border-border/50 hover:bg-surface/50 transition-colors"
                >
                  <td className="py-3.5 px-4 text-foreground">{row.feature}</td>
                  <td className="py-3.5 px-4 text-center bg-primary/5">
                    <span className="inline-flex justify-center">
                      <CellContent value={row.raven} />
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center text-muted">
                    <span className="inline-flex justify-center">
                      <CellContent value={row.litellm} />
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center text-muted">
                    <span className="inline-flex justify-center">
                      <CellContent value={row.portkey} />
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center text-muted">
                    <span className="inline-flex justify-center">
                      <CellContent value={row.cloudflare} />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
