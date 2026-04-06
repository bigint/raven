import {
  ArrowRight,
  BookOpen,
  Cable,
  ChartLine,
  Code,
  Key,
  Route,
  Server,
  Shield,
  Terminal,
  Wallet,
  Zap
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

const features = [
  {
    description:
      "One OpenAI-compatible endpoint for every LLM provider. Switch models without touching your code.",
    href: "/docs/features/providers",
    icon: <Cable className="size-5" />,
    title: "Unified API"
  },
  {
    description:
      "Scoped API keys with per-key rate limits, budgets, expiration, and environment separation.",
    href: "/docs/features/virtual-keys",
    icon: <Key className="size-5" />,
    title: "Virtual Keys"
  },
  {
    description:
      "Route requests by cost, latency, model, or custom logic. Automatic failover across providers.",
    href: "/docs/features/routing-rules",
    icon: <Route className="size-5" />,
    title: "Smart Routing"
  },
  {
    description:
      "PII detection, topic blocking, content filtering, and prompt injection defense — all before the LLM.",
    href: "/docs/features/guardrails",
    icon: <Shield className="size-5" />,
    title: "Guardrails"
  },
  {
    description:
      "Hierarchical budgets at org, team, and key level. Hard limits that block requests before overspend.",
    href: "/docs/features/budgets",
    icon: <Wallet className="size-5" />,
    title: "Cost Control"
  },
  {
    description:
      "Real-time dashboards for tokens, costs, latency percentiles, cache hit rates, and tool usage.",
    href: "/docs/features/analytics",
    icon: <ChartLine className="size-5" />,
    title: "Analytics"
  }
];

const codeExample = `import OpenAI from "openai";

const client = new OpenAI({
  apiKey: "rk_live_...",
  baseURL: "http://localhost:4000/v1",
});

// Works with any provider — OpenAI, Anthropic, etc.
const response = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Hello!" }],
});`;

function FeatureCard({
  icon,
  title,
  description,
  href
}: {
  icon: ReactNode;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      className="group relative rounded-xl border border-fd-border bg-fd-card p-6 transition-all duration-200 hover:border-fd-foreground/15 hover:shadow-sm"
      href={href}
    >
      <div className="mb-4 inline-flex rounded-lg border border-fd-border bg-fd-background p-2.5 text-fd-foreground transition-colors group-hover:border-fd-foreground/15 group-hover:bg-fd-accent">
        {icon}
      </div>
      <h3 className="mb-2 text-[15px] font-semibold text-fd-foreground">
        {title}
      </h3>
      <p className="text-sm leading-relaxed text-fd-muted-foreground">
        {description}
      </p>
    </Link>
  );
}

export default function Page() {
  return (
    <main>
      <section className="relative overflow-hidden border-b border-fd-border">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-20%,hsla(0,0%,50%,0.07),transparent)]" />
        <div className="dark:hidden pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,hsla(0,0%,0%,0.02)_1px,transparent_1px),linear-gradient(to_bottom,hsla(0,0%,0%,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        <div className="hidden dark:block pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,hsla(0,0%,100%,0.02)_1px,transparent_1px),linear-gradient(to_bottom,hsla(0,0%,100%,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem]" />

        <div className="relative mx-auto flex max-w-6xl flex-col items-center px-6 pb-24 pt-28 text-center md:pb-32 md:pt-36">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-fd-border bg-fd-card px-4 py-1.5 text-[13px] text-fd-muted-foreground shadow-sm">
            <Zap className="size-3.5" />
            Open-source &middot; Self-hosted &middot; Full control
          </div>

          <h1 className="mb-6 max-w-4xl text-4xl font-bold tracking-tight text-fd-foreground sm:text-5xl md:text-6xl lg:text-[4rem] lg:leading-[1.1]">
            One gateway for all your{" "}
            <span className="bg-gradient-to-r from-fd-foreground/80 to-fd-foreground bg-clip-text">
              LLM traffic
            </span>
          </h1>

          <p className="mb-10 max-w-2xl text-base text-fd-muted-foreground md:text-lg md:leading-relaxed">
            Raven sits between your application and LLM providers — routing
            requests, enforcing budgets, blocking harmful content, and logging
            everything. Deploy on your infrastructure in minutes.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-fd-primary px-5 text-sm font-medium text-fd-primary-foreground shadow-sm transition-all hover:opacity-90"
              href="/docs"
            >
              Get Started
              <ArrowRight className="size-4" />
            </Link>
            <Link
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-fd-border bg-fd-card px-5 text-sm font-medium text-fd-foreground shadow-sm transition-all hover:bg-fd-accent"
              href="https://github.com/bigint/raven"
              rel="noopener noreferrer"
              target="_blank"
            >
              <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
              </svg>
              Star on GitHub
            </Link>
          </div>
        </div>
      </section>

      <section className="relative border-b border-fd-border bg-fd-card/50">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <div className="mb-14 text-center">
            <p className="mb-3 text-sm font-medium uppercase tracking-widest text-fd-muted-foreground">
              Features
            </p>
            <h2 className="text-3xl font-bold tracking-tight text-fd-foreground md:text-4xl">
              Everything you need to manage LLMs
            </h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-fd-border">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <p className="mb-3 text-sm font-medium uppercase tracking-widest text-fd-muted-foreground">
                Drop-in compatible
              </p>
              <h2 className="mb-4 text-3xl font-bold tracking-tight text-fd-foreground md:text-4xl">
                Change two lines, keep everything else
              </h2>
              <p className="mb-8 text-fd-muted-foreground md:text-lg md:leading-relaxed">
                Raven is fully compatible with the OpenAI SDK. Point your base
                URL at your gateway and swap in a virtual key. Streaming,
                function calling, vision — it all works.
              </p>
              <div className="flex flex-col gap-3 text-sm text-fd-muted-foreground">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-fd-border bg-fd-card">
                    <Terminal className="size-4 text-fd-foreground" />
                  </div>
                  <span>
                    Works with OpenAI, Anthropic, and any OpenAI-compatible SDK
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-fd-border bg-fd-card">
                    <Code className="size-4 text-fd-foreground" />
                  </div>
                  <span>
                    Vercel AI SDK support via @ai-sdk/openai-compatible
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-fd-border bg-fd-card">
                    <BookOpen className="size-4 text-fd-foreground" />
                  </div>
                  <span>
                    Official TypeScript SDK with streaming and error types
                  </span>
                </div>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-fd-border bg-fd-card shadow-sm">
              <div className="flex items-center gap-1.5 border-b border-fd-border bg-fd-muted/50 px-4 py-3">
                <div className="size-2.5 rounded-full bg-fd-border" />
                <div className="size-2.5 rounded-full bg-fd-border" />
                <div className="size-2.5 rounded-full bg-fd-border" />
                <span className="ml-3 text-xs text-fd-muted-foreground">
                  app.ts
                </span>
              </div>
              <pre className="overflow-x-auto p-5 text-[13px] leading-relaxed">
                <code className="text-fd-foreground/85">{codeExample}</code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-fd-border bg-fd-card/50">
        <div className="mx-auto grid max-w-6xl gap-px sm:grid-cols-3">
          {[
            {
              label: "Added latency",
              sublabel: "Gateway overhead",
              value: "< 1ms"
            },
            {
              label: "OpenAI compatible",
              sublabel: "Drop-in replacement",
              value: "100%"
            },
            {
              label: "To deploy",
              sublabel: "Docker Compose",
              value: "5 min"
            }
          ].map((stat) => (
            <div
              className="flex flex-col items-center justify-center px-6 py-14 text-center"
              key={stat.label}
            >
              <p className="text-4xl font-bold tracking-tight text-fd-foreground md:text-5xl">
                {stat.value}
              </p>
              <p className="mt-2 text-sm font-medium text-fd-foreground">
                {stat.label}
              </p>
              <p className="text-xs text-fd-muted-foreground">
                {stat.sublabel}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <div className="flex flex-col items-center rounded-2xl border border-fd-border bg-fd-card p-10 text-center shadow-sm md:p-16">
            <Server className="mb-6 size-10 text-fd-muted-foreground" />
            <h2 className="mb-3 text-3xl font-bold tracking-tight text-fd-foreground md:text-4xl">
              Deploy on your infrastructure
            </h2>
            <p className="mb-8 max-w-lg text-fd-muted-foreground md:text-lg">
              Your API keys, request logs, and usage data never leave your
              servers. One command to get started.
            </p>
            <div className="mb-8 w-full max-w-md overflow-hidden rounded-xl border border-fd-border bg-fd-background shadow-sm">
              <pre className="px-5 py-4 text-left text-sm">
                <code className="text-fd-foreground/85">
                  <span className="text-fd-muted-foreground">$</span> curl -O
                  https://raw.githubusercontent.com/bigint/raven/main/docker-compose.yml
                  {"\n"}
                  <span className="text-fd-muted-foreground">$</span> docker
                  compose up -d
                </code>
              </pre>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-fd-primary px-5 text-sm font-medium text-fd-primary-foreground shadow-sm transition-all hover:opacity-90"
                href="/docs/guides/self-hosting"
              >
                Self-Hosting Guide
                <ArrowRight className="size-4" />
              </Link>
              <Link
                className="inline-flex h-10 items-center rounded-lg border border-fd-border bg-fd-background px-5 text-sm font-medium text-fd-foreground shadow-sm transition-all hover:bg-fd-accent"
                href="/docs/getting-started/quickstart"
              >
                Quickstart
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-fd-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-fd-muted-foreground sm:flex-row">
          <p>
            Built by{" "}
            <a
              className="font-medium text-fd-foreground transition-colors hover:text-fd-foreground/80"
              href="https://x.com/yoginth"
              rel="noopener noreferrer"
              target="_blank"
            >
              Yoginth
            </a>
          </p>
          <div className="flex items-center gap-6">
            <a
              className="transition-colors hover:text-fd-foreground"
              href="https://github.com/bigint/raven"
              rel="noopener noreferrer"
              target="_blank"
            >
              GitHub
            </a>
            <a
              className="transition-colors hover:text-fd-foreground"
              href="https://x.com/yoginth"
              rel="noopener noreferrer"
              target="_blank"
            >
              X
            </a>
            <a
              className="transition-colors hover:text-fd-foreground"
              href="mailto:yoginth@hey.com"
            >
              Support
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
