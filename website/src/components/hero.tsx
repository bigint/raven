import { Button } from '@/components/ui/button'
import { TerminalDemo } from '@/components/terminal-demo'
import { ArrowRight, Github } from 'lucide-react'

export function Hero() {
  return (
    <section className="relative pt-32 pb-24 md:pt-44 md:pb-32 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#4338CA]/8 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[#4338CA]/5 rounded-full blur-[128px] pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="font-heading text-5xl md:text-7xl lg:text-8xl tracking-tight text-foreground animate-fade-in-up">
            One gateway.
            <br />
            Every AI provider.
            <br />
            <span className="text-primary-light">Zero telemetry.</span>
          </h1>

          <p className="mt-8 text-lg md:text-xl text-muted max-w-2xl mx-auto leading-relaxed animate-fade-in-up-delay-1">
            Route, cache, observe, and govern LLM traffic across 50+ providers. Ships as a single
            binary. Never phones home.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up-delay-2">
            <Button href="/docs" variant="primary">
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              href="https://github.com/bigint-studio/raven"
              variant="secondary"
            >
              <Github className="h-4 w-4" />
              View on GitHub
            </Button>
          </div>
        </div>

        <div className="mt-20 animate-fade-in-up-delay-3">
          <TerminalDemo />
        </div>
      </div>
    </section>
  )
}
