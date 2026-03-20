import {
  Activity,
  ArrowRight,
  GitBranch,
  Key,
  LayoutDashboard,
  Shield,
  Zap
} from "lucide-react";
import Link from "next/link";

const features = [
  {
    description:
      "One API endpoint for OpenAI, Anthropic, Google, Mistral, DeepSeek, and more. Drop-in OpenAI-compatible replacement.",
    icon: Zap,
    title: "Unified API"
  },
  {
    description:
      "Automatically route requests across providers with load balancing, fallbacks, and conditional routing rules.",
    icon: GitBranch,
    title: "Smart Routing"
  },
  {
    description:
      "Track every request with detailed cost breakdowns, token usage, latency metrics, and session analytics.",
    icon: Activity,
    title: "Analytics & Cost Tracking"
  },
  {
    description:
      "Set spending limits per key or globally. Get alerts before you hit budget thresholds.",
    icon: LayoutDashboard,
    title: "Budget Controls"
  },
  {
    description:
      "Content filtering, PII detection, topic blocking, and custom regex rules to keep your AI usage safe.",
    icon: Shield,
    title: "Guardrails"
  },
  {
    description:
      "Generate scoped virtual API keys with rate limits, expiration, and environment separation.",
    icon: Key,
    title: "Key Management"
  }
];

export const HomePageContent = () => {
  return (
    <div className="px-4 sm:px-6">
      {/* Hero */}
      <section className="mx-auto max-w-3xl pb-20 pt-24 text-center sm:pt-32">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground">
          <span className="size-1.5 rounded-full bg-success" />
          Open source and self-hosted
        </div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          One API for every
          <br />
          <span className="text-muted-foreground">LLM provider</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
          Raven is an open-source AI model gateway. Route requests to any
          provider, track costs, enforce guardrails, and manage access — all
          from a single dashboard.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link
            className="inline-flex items-center gap-2 rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
            href="/sign-in"
          >
            Get Started
            <ArrowRight className="size-4" />
          </Link>
          <a
            className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
            href="https://github.com/bigint/raven"
            rel="noopener noreferrer"
            target="_blank"
          >
            <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            GitHub
          </a>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl pb-24">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              className="rounded-xl border border-border bg-card p-6 transition-colors hover:bg-muted/30"
              key={feature.title}
            >
              <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-muted">
                <feature.icon className="size-5 text-foreground" />
              </div>
              <h3 className="text-sm font-semibold">{feature.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Code example */}
      <section className="mx-auto max-w-3xl pb-24">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight">
            Drop-in compatible
          </h2>
          <p className="mt-2 text-muted-foreground">
            Use the OpenAI SDK — just change the base URL
          </p>
        </div>
        <div className="mt-8 overflow-hidden rounded-xl border border-border bg-[#0a0a0a]">
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
            <span className="size-3 rounded-full bg-white/10" />
            <span className="size-3 rounded-full bg-white/10" />
            <span className="size-3 rounded-full bg-white/10" />
          </div>
          <pre className="overflow-x-auto p-6 text-sm leading-relaxed text-gray-300">
            <code>{`import OpenAI from "openai";

const client = new OpenAI({
  apiKey: "rk_live_...",
  baseURL: "https://your-raven-instance/v1"
});

const response = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Hello!" }]
});`}</code>
          </pre>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-3xl pb-24 text-center">
        <h2 className="text-2xl font-bold tracking-tight">
          Deploy in one command
        </h2>
        <div className="mt-4 overflow-hidden rounded-xl border border-border bg-[#0a0a0a]">
          <pre className="px-6 py-4 text-sm text-gray-300">
            <code>docker compose up</code>
          </pre>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Self-host on any server. No vendor lock-in. No usage limits.
        </p>
      </section>
    </div>
  );
};
