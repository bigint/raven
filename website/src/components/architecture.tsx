'use client'

import { cn } from '@/lib/utils'
import { useEffect, useRef, useState } from 'react'

const steps = [
  { label: 'Auth', description: 'API key validation & RBAC' },
  { label: 'Cache', description: 'Semantic + exact match lookup' },
  { label: 'Route', description: 'Load balance & failover' },
  { label: 'Provider', description: 'OpenAI, Anthropic, etc.' },
]

export function Architecture() {
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
      { threshold: 0.2 },
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section className="py-24 md:py-32" ref={ref}>
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="font-heading text-4xl md:text-5xl text-foreground">How Raven Works</h2>
          <p className="mt-4 text-lg text-muted">
            Every request flows through a pipeline of middleware before reaching the provider.
          </p>
        </div>

        <div className="relative mx-auto max-w-4xl">
          {/* Diagram */}
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-0">
            {/* Client */}
            <div
              className={cn(
                'flex-shrink-0 rounded-xl border border-border bg-surface px-6 py-4 text-center transition-all duration-700',
                visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8',
              )}
            >
              <div className="text-xs text-muted uppercase tracking-wider mb-1">Client</div>
              <div className="text-sm font-medium text-foreground">Your App</div>
            </div>

            {/* Arrow */}
            <div
              className={cn(
                'hidden md:block flex-shrink-0 w-8 h-px bg-gradient-to-r from-border to-primary/50 transition-all duration-700 delay-200',
                visible ? 'opacity-100' : 'opacity-0',
              )}
            />
            <div
              className={cn(
                'md:hidden flex-shrink-0 h-8 w-px bg-gradient-to-b from-border to-primary/50 transition-all duration-700 delay-200',
                visible ? 'opacity-100' : 'opacity-0',
              )}
            />

            {/* Gateway box */}
            <div
              className={cn(
                'flex-1 rounded-xl border border-primary/30 bg-primary/5 p-6 transition-all duration-700 delay-300',
                visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
              )}
            >
              <div className="text-xs text-primary-light uppercase tracking-wider mb-4 text-center">
                Raven Gateway
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {steps.map((step, i) => (
                  <div
                    key={step.label}
                    className={cn(
                      'relative rounded-lg border border-border bg-background p-3 text-center transition-all duration-500',
                      visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
                    )}
                    style={{ transitionDelay: visible ? `${400 + i * 100}ms` : '0ms' }}
                  >
                    <div className="text-sm font-medium text-foreground">{step.label}</div>
                    <div className="text-xs text-muted mt-1">{step.description}</div>
                    {i < steps.length - 1 && (
                      <div className="hidden md:block absolute top-1/2 -right-3 w-3 h-px bg-border" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Explanation */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2 font-body">Single Entry Point</h3>
              <p className="text-sm text-muted leading-relaxed">
                All AI requests flow through one gateway. Swap providers without changing a line of
                application code.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2 font-body">Middleware Pipeline</h3>
              <p className="text-sm text-muted leading-relaxed">
                Authentication, caching, rate limiting, and routing happen transparently in the
                request pipeline.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2 font-body">Provider Agnostic</h3>
              <p className="text-sm text-muted leading-relaxed">
                Automatic failover, load balancing, and model mapping across all supported
                providers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
