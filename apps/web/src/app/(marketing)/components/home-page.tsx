import { ArrowRight, BarChart3, Key, Network, Shield, Zap } from "lucide-react";
import Link from "next/link";
import { HeroWordRotator } from "./hero-word-rotator";

const providers = [
  "OpenAI",
  "Anthropic",
  "Google",
  "Mistral",
  "Cohere",
  "Azure"
];

const features = [
  {
    description:
      "Create scoped API keys with rate limits and budgets. Distribute access without exposing provider credentials.",
    icon: Key,
    title: "Virtual Keys"
  },
  {
    description:
      "Track usage, costs, and latency across every provider and model in a single dashboard.",
    icon: BarChart3,
    title: "Real-time Analytics"
  },
  {
    description:
      "Set spending limits, rate caps, and content filters to keep usage predictable and safe.",
    icon: Shield,
    title: "Smart Guardrails"
  }
];

const steps = [
  {
    description:
      "Add your API keys from OpenAI, Anthropic, Google, or any supported provider.",
    icon: Network,
    title: "Connect providers"
  },
  {
    description:
      "Generate virtual keys with scoped permissions, rate limits, and budgets for your team.",
    icon: Key,
    title: "Create virtual keys"
  },
  {
    description:
      "Track every request, analyze costs, and optimize usage across all providers.",
    icon: BarChart3,
    title: "Monitor everything"
  }
];

export const HomePageContent = () => {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 size-[1000px] -translate-x-1/2 -translate-y-1/4 rounded-full bg-linear-to-b from-blue-500/8 to-violet-500/3 blur-[150px] dark:from-blue-500/12 dark:to-violet-500/5" />
          <div className="absolute -right-20 top-1/4 size-[400px] rounded-full bg-cyan-500/5 blur-[100px] dark:bg-cyan-500/7" />
          <div className="absolute -left-20 top-1/2 size-[300px] rounded-full bg-indigo-500/4 blur-[80px] dark:bg-indigo-500/6" />
        </div>
        {/* Dot grid with vignette */}
        <div className="pointer-events-none absolute inset-0 -z-10 mask-[radial-gradient(ellipse_80%_50%_at_50%_30%,black_30%,transparent_100%)]">
          <div className="size-full bg-[radial-gradient(circle,#00000008_1px,transparent_1px)] bg-size-[24px_24px] dark:bg-[radial-gradient(circle,#ffffff06_1px,transparent_1px)]" />
        </div>

        <div className="mx-auto max-w-5xl px-4 pb-24 pt-20 text-center sm:px-6 sm:pb-32 sm:pt-36 lg:pt-44">
          <div className="animate-fade-in">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-4 py-1.5 text-sm text-muted-foreground shadow-xs backdrop-blur-sm">
              <span className="size-2 animate-pulse rounded-full bg-success" />
              Now in beta
            </div>
          </div>

          <div className="animate-fade-in" style={{ animationDelay: "0.05s" }}>
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              <span className="block">One gateway for</span>
              <span className="block">
                <HeroWordRotator />
              </span>
            </h1>
          </div>

          <div className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Route, monitor, and manage API calls across OpenAI, Anthropic,
              Google, and more. Built for teams that need control and
              visibility.
            </p>
          </div>

          <div className="animate-fade-in" style={{ animationDelay: "0.15s" }}>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <Link
                className="group inline-flex items-center gap-2 rounded-xl bg-foreground px-7 py-3.5 text-sm font-medium text-background shadow-md transition-all hover:shadow-lg hover:opacity-90"
                href="/sign-up"
              >
                Start for free
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                className="inline-flex items-center gap-2 rounded-xl border border-border px-7 py-3.5 text-sm font-medium transition-colors hover:bg-muted"
                href="/docs"
              >
                View documentation
              </Link>
            </div>
          </div>

          {/* Terminal */}
          <div className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <div className="relative mx-auto mt-20 max-w-2xl">
              {/* Terminal glow */}
              <div className="pointer-events-none absolute -inset-6 -z-10 rounded-3xl bg-linear-to-b from-blue-500/7 via-transparent to-transparent blur-2xl dark:from-blue-500/10" />

              <div className="overflow-hidden rounded-2xl border border-white/8 bg-[#0a0a0a] shadow-2xl ring-1 ring-white/5">
                {/* Header */}
                <div className="flex items-center gap-2 border-b border-white/6 px-4 py-3">
                  <div className="flex gap-1.5">
                    <div className="size-3 rounded-full bg-[#ff5f57]" />
                    <div className="size-3 rounded-full bg-[#febc2e]" />
                    <div className="size-3 rounded-full bg-[#28c840]" />
                  </div>
                  <span className="ml-2 text-xs text-neutral-500">
                    Terminal
                  </span>
                </div>

                {/* Body */}
                <div className="overflow-x-auto p-5 text-left font-mono text-xs leading-relaxed sm:p-6 sm:text-sm">
                  <div
                    className="animate-fade-in"
                    style={{ animationDelay: "0.5s" }}
                  >
                    <p className="text-neutral-500">
                      <span className="text-neutral-600"># </span>Just change
                      your base URL
                    </p>
                  </div>

                  <div
                    className="animate-fade-in"
                    style={{ animationDelay: "0.8s" }}
                  >
                    <p className="mt-3">
                      <span className="text-blue-400">curl </span>
                      <span className="text-neutral-200">
                        https://api.raven.dev/v1/chat/completions \
                      </span>
                    </p>
                  </div>

                  <div
                    className="animate-fade-in"
                    style={{ animationDelay: "1.0s" }}
                  >
                    <p className="pl-4 text-neutral-200">
                      -H{" "}
                      <span className="text-emerald-400">
                        &quot;Authorization: Bearer rk_live_...&quot;
                      </span>{" "}
                      \
                    </p>
                  </div>

                  <div
                    className="animate-fade-in"
                    style={{ animationDelay: "1.2s" }}
                  >
                    <p className="pl-4 text-neutral-200">
                      -H{" "}
                      <span className="text-emerald-400">
                        &quot;Content-Type: application/json&quot;
                      </span>{" "}
                      \
                    </p>
                  </div>

                  <div
                    className="animate-fade-in"
                    style={{ animationDelay: "1.4s" }}
                  >
                    <p className="pl-4 text-neutral-200">
                      -d{" "}
                      <span className="text-amber-400">
                        &apos;&#123;&quot;model&quot;: &quot;gpt-4o&quot;,
                        &quot;messages&quot;: [...]&#125;&apos;
                      </span>
                    </p>
                  </div>

                  {/* Response */}
                  <div
                    className="animate-fade-in"
                    style={{ animationDelay: "2.0s" }}
                  >
                    <div className="mt-4 border-t border-white/6 pt-4">
                      <p>
                        <span className="text-emerald-400">
                          &#10003; 200 OK
                        </span>
                        <span className="text-neutral-600">
                          {" "}
                          &middot; 847ms &middot; gpt-4o
                        </span>
                      </p>
                      <p className="mt-2 text-neutral-500">&lbrace;</p>
                      <p className="pl-4 text-neutral-300">
                        &quot;content&quot;:{" "}
                        <span className="text-amber-400">
                          &quot;Hello! How can I help you today?&quot;
                        </span>
                      </p>
                      <p className="text-neutral-500">&rbrace;</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Providers */}
      <section className="border-y border-border/60 py-12">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <p className="mb-8 text-sm font-medium text-muted-foreground">
            Works with every major AI provider
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {providers.map((name) => (
              <span
                className="rounded-full border border-border/60 bg-muted/40 px-4 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                key={name}
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-28">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mb-16 text-center">
            <div className="animate-fade-in">
              <p className="mb-3 text-sm font-medium text-muted-foreground">
                Features
              </p>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Everything you need to manage AI
              </h2>
            </div>
            <div
              className="animate-fade-in"
              style={{ animationDelay: "0.05s" }}
            >
              <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
                One platform to connect, control, and monitor all your AI
                provider integrations.
              </p>
            </div>
          </div>

          <div className="animate-fade-in-stagger grid grid-cols-1 gap-5 sm:grid-cols-3">
            {features.map((feature, i) => (
              <div
                className="animate-fade-in group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-7 transition-all duration-300 hover:-translate-y-0.5 hover:border-border hover:shadow-md"
                key={feature.title}
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-muted/50 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="relative">
                  <div className="mb-5 inline-flex rounded-xl bg-linear-to-br from-muted to-muted/60 p-3">
                    <feature.icon className="size-5 text-foreground" />
                  </div>
                  <h3 className="text-base font-semibold">{feature.title}</h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="relative border-t border-border/60 py-28">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-b from-muted/30 via-transparent to-muted/20" />
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="mb-16 text-center">
            <div className="animate-fade-in">
              <p className="mb-3 text-sm font-medium text-muted-foreground">
                How it works
              </p>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Up and running in minutes
              </h2>
            </div>
            <div
              className="animate-fade-in"
              style={{ animationDelay: "0.05s" }}
            >
              <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
                Three steps to centralize your AI infrastructure.
              </p>
            </div>
          </div>

          <div className="relative grid grid-cols-1 gap-12 sm:grid-cols-3 sm:gap-8">
            {/* Connecting line */}
            <div className="pointer-events-none absolute left-0 right-0 top-6 hidden h-px bg-linear-to-r from-transparent via-border to-transparent sm:block" />

            {steps.map((step, i) => (
              <div
                className="animate-fade-in relative text-center"
                key={step.title}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="relative mx-auto mb-5 flex size-12 items-center justify-center rounded-full bg-foreground text-background shadow-md ring-4 ring-background">
                  <span className="text-sm font-bold">{i + 1}</span>
                </div>
                <h3 className="text-base font-semibold">{step.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden border-t border-border/60 py-28">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-1/2 size-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/4 blur-[100px] dark:bg-blue-500/6" />
        </div>
        <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
          <div className="animate-fade-in">
            <div className="mb-6 inline-flex rounded-2xl bg-foreground/5 p-4">
              <Zap className="size-6 text-foreground" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
              Ready to simplify your AI stack?
            </h2>
            <p className="mx-auto mt-5 max-w-md text-muted-foreground">
              Start routing requests through Raven today. Free to start, scales
              with your team.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link
                className="group inline-flex items-center gap-2 rounded-xl bg-foreground px-7 py-3.5 text-sm font-medium text-background shadow-md transition-all hover:shadow-lg hover:opacity-90"
                href="/sign-up"
              >
                Get started free
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
            <p className="mt-5 text-xs text-muted-foreground">
              No credit card required
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
