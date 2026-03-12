"use client";

import { FadeIn, StaggerItem, StaggerList } from "@raven/ui";
import { ArrowRight, BarChart3, Key, Network, Shield, Zap } from "lucide-react";
import Link from "next/link";

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

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-muted/50 to-background" />
        <div className="mx-auto max-w-4xl px-6 pb-20 pt-24 text-center sm:pt-32 lg:pt-40">
          <FadeIn>
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-1.5 text-sm text-muted-foreground">
              <span className="size-2 rounded-full bg-success animate-pulse" />
              Now in beta
            </div>
          </FadeIn>

          <FadeIn delay={0.05}>
            <h1 className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              One gateway for{" "}
              <span className="bg-gradient-to-r from-foreground to-foreground/40 bg-clip-text text-transparent">
                all your AI
              </span>
            </h1>
          </FadeIn>

          <FadeIn delay={0.1}>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Route, monitor, and manage API calls across OpenAI, Anthropic,
              Google, and more. Built for teams that need control and
              visibility.
            </p>
          </FadeIn>

          <FadeIn delay={0.15}>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link
                className="inline-flex items-center gap-2 rounded-lg bg-foreground px-6 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90"
                href="/sign-up"
              >
                Start for free
                <ArrowRight className="size-4" />
              </Link>
              <Link
                className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 text-sm font-medium transition-colors hover:bg-muted"
                href="/docs"
              >
                View documentation
              </Link>
            </div>
          </FadeIn>

          {/* Code preview */}
          <FadeIn delay={0.2}>
            <div className="mx-auto mt-16 max-w-2xl overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                <div className="flex gap-1.5">
                  <div className="size-3 rounded-full bg-border" />
                  <div className="size-3 rounded-full bg-border" />
                  <div className="size-3 rounded-full bg-border" />
                </div>
                <span className="ml-2 text-xs text-muted-foreground">
                  Terminal
                </span>
              </div>
              <div className="p-5 text-left font-mono text-sm leading-relaxed">
                <p className="text-muted-foreground">
                  <span className="text-foreground/50"># </span>Just change your
                  base URL
                </p>
                <p className="mt-3 text-foreground">
                  <span className="text-muted-foreground">curl </span>
                  https://api.raven.dev/v1/chat/completions \
                </p>
                <p className="pl-4 text-foreground">
                  -H{" "}
                  <span className="text-muted-foreground">
                    &quot;Authorization: Bearer rk_live_...&quot;
                  </span>{" "}
                  \
                </p>
                <p className="pl-4 text-foreground">
                  -H{" "}
                  <span className="text-muted-foreground">
                    &quot;Content-Type: application/json&quot;
                  </span>{" "}
                  \
                </p>
                <p className="pl-4 text-foreground">
                  -d{" "}
                  <span className="text-muted-foreground">
                    &apos;&#123;&quot;model&quot;: &quot;gpt-4o&quot;,
                    &quot;messages&quot;: [...]&#125;&apos;
                  </span>
                </p>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Providers */}
      <section className="border-y border-border bg-muted/30 py-12">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <p className="mb-6 text-sm font-medium text-muted-foreground">
            Works with every major AI provider
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {providers.map((name) => (
              <span
                className="text-sm font-medium text-muted-foreground/70"
                key={name}
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-14 text-center">
            <FadeIn>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Everything you need to manage AI
              </h2>
            </FadeIn>
            <FadeIn delay={0.05}>
              <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
                One platform to connect, control, and monitor all your AI
                provider integrations.
              </p>
            </FadeIn>
          </div>

          <StaggerList
            className="grid grid-cols-1 gap-6 sm:grid-cols-3"
            staggerDelay={0.08}
          >
            {features.map((feature) => (
              <StaggerItem key={feature.title}>
                <div className="group rounded-xl border border-border p-6 transition-colors hover:bg-muted/50">
                  <div className="mb-4 inline-flex rounded-lg bg-muted p-2.5">
                    <feature.icon className="size-5 text-foreground" />
                  </div>
                  <h3 className="text-base font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </StaggerList>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border bg-muted/20 py-24">
        <div className="mx-auto max-w-4xl px-6">
          <div className="mb-14 text-center">
            <FadeIn>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Up and running in minutes
              </h2>
            </FadeIn>
            <FadeIn delay={0.05}>
              <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
                Three steps to centralize your AI infrastructure.
              </p>
            </FadeIn>
          </div>

          <StaggerList
            className="grid grid-cols-1 gap-8 sm:grid-cols-3"
            staggerDelay={0.1}
          >
            {steps.map((step, i) => (
              <StaggerItem key={step.title}>
                <div className="text-center">
                  <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-foreground text-background">
                    <span className="text-sm font-bold">{i + 1}</span>
                  </div>
                  <h3 className="text-base font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </StaggerList>
        </div>
      </section>

      {/* Stats */}
      <section className="py-24">
        <div className="mx-auto max-w-4xl px-6">
          <FadeIn>
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
              {[
                { label: "Providers supported", value: "10+" },
                { label: "API compatibility", value: "100%" },
                { label: "Avg latency added", value: "<5ms" },
                { label: "Uptime SLA", value: "99.9%" }
              ].map((stat) => (
                <div className="text-center" key={stat.label}>
                  <p className="text-3xl font-bold tracking-tight">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-muted/30 py-24">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <FadeIn>
            <div className="mb-6 inline-flex rounded-lg bg-foreground/5 p-3">
              <Zap className="size-6 text-foreground" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to simplify your AI stack?
            </h2>
            <p className="mx-auto mt-4 max-w-md text-muted-foreground">
              Start routing requests through Raven today. Free to start, scales
              with your team.
            </p>
            <div className="mt-8 flex items-center justify-center gap-4">
              <Link
                className="inline-flex items-center gap-2 rounded-lg bg-foreground px-6 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90"
                href="/sign-up"
              >
                Get started free
                <ArrowRight className="size-4" />
              </Link>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              No credit card required
            </p>
          </FadeIn>
        </div>
      </section>
    </div>
  );
}
