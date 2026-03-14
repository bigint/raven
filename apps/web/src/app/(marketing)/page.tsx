"use client";

import { FadeIn, StaggerItem, StaggerList } from "@raven/ui";
import {
  ArrowRight,
  BarChart3,
  Key,
  Network,
  Shield,
  Zap
} from "lucide-react";
import { useInView } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { TextMorph } from "torph/react";

const heroWords = [
  "all your AI",
  "every model",
  "every provider",
  "your team"
];

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

function AnimatedNumber({ value }: { value: string }) {
  const match = value.match(/^([<>]?)(\d+\.?\d*)(.*)/);
  if (!match) return <span>{value}</span>;

  const prefix = match[1] ?? "";
  const numStr = match[2] ?? "0";
  const suffix = match[3] ?? "";
  const target = Number.parseFloat(numStr);
  const [current, setCurrent] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const duration = 1200;
    const start = Date.now();
    let rafId: number;
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      setCurrent(eased * target);
      if (progress < 1) rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [inView, target]);

  return (
    <span ref={ref}>
      {prefix}
      {numStr.includes(".") ? current.toFixed(1) : Math.round(current)}
      {suffix}
    </span>
  );
}

export default function HomePage() {
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((i) => (i + 1) % heroWords.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 size-[800px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-blue-500/[0.06] blur-[120px] dark:bg-blue-500/[0.08]" />
          <div className="absolute right-0 top-1/3 size-[500px] translate-x-1/4 rounded-full bg-purple-500/[0.04] blur-[100px] dark:bg-purple-500/[0.06]" />
        </div>
        {/* Dot grid with vignette */}
        <div className="pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_30%,black_40%,transparent_100%)]">
          <div className="size-full bg-[radial-gradient(circle,#00000008_1px,transparent_1px)] bg-[length:24px_24px] dark:bg-[radial-gradient(circle,#ffffff08_1px,transparent_1px)]" />
        </div>

        <div className="mx-auto max-w-4xl px-4 pb-20 pt-20 text-center sm:px-6 sm:pb-28 sm:pt-36 lg:pt-44">
          <FadeIn>
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-4 py-1.5 text-sm text-muted-foreground shadow-xs backdrop-blur-sm">
              <span className="size-2 animate-pulse rounded-full bg-success" />
              Now in beta
            </div>
          </FadeIn>

          <FadeIn delay={0.05}>
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              One gateway for{" "}
              <TextMorph as="span">{heroWords[wordIndex]}</TextMorph>
            </h1>
          </FadeIn>

          <FadeIn delay={0.1}>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Route, monitor, and manage API calls across OpenAI, Anthropic,
              Google, and more. Built for teams that need control and visibility.
            </p>
          </FadeIn>

          <FadeIn delay={0.15}>
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
          </FadeIn>

          {/* Code preview */}
          <FadeIn delay={0.2}>
            <div className="mx-auto mt-16 max-w-2xl overflow-hidden rounded-2xl border border-border/60 bg-card shadow-lg ring-1 ring-black/[0.03] dark:ring-white/[0.03]">
              <div className="flex items-center gap-2 border-b border-border/60 bg-muted/40 px-4 py-3">
                <div className="flex gap-1.5">
                  <div className="size-3 rounded-full bg-red-400/60 dark:bg-red-400/40" />
                  <div className="size-3 rounded-full bg-yellow-400/60 dark:bg-yellow-400/40" />
                  <div className="size-3 rounded-full bg-green-400/60 dark:bg-green-400/40" />
                </div>
                <span className="ml-2 text-xs text-muted-foreground">
                  Terminal
                </span>
              </div>
              <div className="overflow-x-auto p-5 text-left font-mono text-xs leading-relaxed sm:p-6 sm:text-sm">
                <p className="text-muted-foreground">
                  <span className="text-foreground/40"># </span>Just change your
                  base URL
                </p>
                <p className="mt-3">
                  <span className="text-blue-500 dark:text-blue-400">
                    curl{" "}
                  </span>
                  <span className="text-foreground">
                    https://api.raven.dev/v1/chat/completions \
                  </span>
                </p>
                <p className="pl-4 text-foreground">
                  -H{" "}
                  <span className="text-emerald-600 dark:text-emerald-400">
                    &quot;Authorization: Bearer rk_live_...&quot;
                  </span>{" "}
                  \
                </p>
                <p className="pl-4 text-foreground">
                  -H{" "}
                  <span className="text-emerald-600 dark:text-emerald-400">
                    &quot;Content-Type: application/json&quot;
                  </span>{" "}
                  \
                </p>
                <p className="pl-4 text-foreground">
                  -d{" "}
                  <span className="text-amber-600 dark:text-amber-400">
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
            <FadeIn>
              <p className="mb-3 text-sm font-medium text-muted-foreground">
                Features
              </p>
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
            className="grid grid-cols-1 gap-5 sm:grid-cols-3"
            staggerDelay={0.08}
          >
            {features.map((feature) => (
              <StaggerItem key={feature.title}>
                <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-7 transition-all duration-300 hover:-translate-y-0.5 hover:border-border hover:shadow-md">
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-muted/50 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="relative">
                    <div className="mb-5 inline-flex rounded-xl bg-gradient-to-br from-muted to-muted/60 p-3">
                      <feature.icon className="size-5 text-foreground" />
                    </div>
                    <h3 className="text-base font-semibold">{feature.title}</h3>
                    <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerList>
        </div>
      </section>

      {/* How it works */}
      <section className="relative border-t border-border/60 py-28">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-muted/30 via-transparent to-muted/20" />
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="mb-16 text-center">
            <FadeIn>
              <p className="mb-3 text-sm font-medium text-muted-foreground">
                How it works
              </p>
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
            className="relative grid grid-cols-1 gap-12 sm:grid-cols-3 sm:gap-8"
            staggerDelay={0.1}
          >
            {/* Connecting line */}
            <div className="pointer-events-none absolute left-0 right-0 top-6 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent sm:block" />

            {steps.map((step, i) => (
              <StaggerItem key={step.title}>
                <div className="relative text-center">
                  <div className="relative mx-auto mb-5 flex size-12 items-center justify-center rounded-full bg-foreground text-background shadow-md ring-4 ring-background">
                    <span className="text-sm font-bold">{i + 1}</span>
                  </div>
                  <h3 className="text-base font-semibold">{step.title}</h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </StaggerList>
        </div>
      </section>

      {/* Stats */}
      <section className="py-28">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <FadeIn>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
              {[
                { label: "Providers supported", value: "10+" },
                { label: "API compatibility", value: "100%" },
                { label: "Avg latency added", value: "<5ms" }
              ].map((stat) => (
                <div
                  className="rounded-2xl border border-border/60 bg-card p-6 text-center transition-colors hover:border-border"
                  key={stat.label}
                >
                  <p className="text-3xl font-bold tracking-tight sm:text-4xl">
                    <AnimatedNumber value={stat.value} />
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden border-t border-border/60 py-28">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-1/2 size-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/[0.04] blur-[100px] dark:bg-blue-500/[0.06]" />
        </div>
        <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
          <FadeIn>
            <div className="mb-6 inline-flex rounded-2xl bg-foreground/[0.05] p-4">
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
          </FadeIn>
        </div>
      </section>
    </div>
  );
}
