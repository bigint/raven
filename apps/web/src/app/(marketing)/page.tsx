import { BarChart3, Key, Shield } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center px-8 py-32">
      <div className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-1.5 text-sm text-muted-foreground mb-8">
        <span className="size-2 rounded-full bg-success animate-pulse" />
        Now in beta
      </div>

      <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-center max-w-3xl">
        One gateway for all your{" "}
        <span className="bg-gradient-to-r from-neutral-900 to-neutral-500 bg-clip-text text-transparent">
          AI providers
        </span>
      </h1>

      <p className="mt-6 text-lg text-muted-foreground text-center max-w-xl leading-relaxed">
        Route, monitor, and manage API calls across OpenAI, Anthropic, Google,
        and more. Built for teams that need control and visibility.
      </p>

      <div className="flex items-center gap-4 mt-10">
        <Link
          className="px-6 py-3 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
          href="/sign-up"
        >
          Start for free
        </Link>
        <Link
          className="px-6 py-3 text-sm font-medium border border-border rounded-lg hover:bg-muted transition-colors"
          href="/sign-in"
        >
          Sign in
        </Link>
      </div>

      <div className="mt-24 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl w-full">
        <div className="space-y-2">
          <div className="size-10 rounded-lg bg-muted flex items-center justify-center">
            <Key className="size-5 text-muted-foreground" />
          </div>
          <h3 className="font-semibold">Virtual Keys</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Create scoped API keys with rate limits and budgets. Never expose
            provider keys again.
          </p>
        </div>
        <div className="space-y-2">
          <div className="size-10 rounded-lg bg-muted flex items-center justify-center">
            <BarChart3 className="size-5 text-muted-foreground" />
          </div>
          <h3 className="font-semibold">Real-time Analytics</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Track usage, costs, and latency across all providers in one
            dashboard.
          </p>
        </div>
        <div className="space-y-2">
          <div className="size-10 rounded-lg bg-muted flex items-center justify-center">
            <Shield className="size-5 text-muted-foreground" />
          </div>
          <h3 className="font-semibold">Guardrails</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Set budgets, rate limits, and content filters to keep usage under
            control.
          </p>
        </div>
      </div>
    </div>
  );
}
