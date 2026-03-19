import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  description:
    "Get up and running with Raven in under 5 minutes. Connect providers, create virtual keys, and start routing AI requests.",
  title: "Getting Started - Raven"
};

const steps = [
  {
    content: (
      <div className="flex items-center gap-3">
        <Link
          className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
          href="/sign-up"
        >
          Create account
        </Link>
        <span className="text-sm text-muted-foreground">
          Takes less than 30 seconds
        </span>
      </div>
    ),
    description:
      "Create your free Raven account to get started. No credit card required.",
    number: 1,
    title: "Sign up for an account"
  },
  {
    content: (
      <div className="bg-muted rounded-lg p-4 text-sm font-mono">
        <p className="text-muted-foreground">
          # Navigate to Settings → Providers
        </p>
        <p className="mt-2">
          Provider: <span className="font-semibold">OpenAI</span>
        </p>
        <p>
          API Key: <span className="font-semibold">sk-proj-...your-key</span>
        </p>
      </div>
    ),
    description:
      "Connect an AI provider by adding your API key. Raven supports OpenAI, Anthropic, Google, and more.",
    number: 2,
    title: "Add your first provider"
  },
  {
    content: (
      <div className="bg-muted rounded-lg p-4 text-sm font-mono">
        <p className="text-muted-foreground">
          # Navigate to Virtual Keys → Create Key
        </p>
        <p className="mt-2">
          Name: <span className="font-semibold">my-app-key</span>
        </p>
        <p>
          Provider: <span className="font-semibold">OpenAI</span>
        </p>
        <p>
          Rate limit: <span className="font-semibold">100 req/min</span>
        </p>
        <p className="mt-2 text-muted-foreground"># Your key will look like:</p>
        <p className="font-semibold">rk_live_abc123def456...</p>
      </div>
    ),
    description:
      "Generate a virtual key that routes requests through Raven. Set rate limits, budgets, and allowed models.",
    number: 3,
    title: "Create a virtual key"
  },
  {
    content: (
      <div className="bg-muted rounded-lg p-4 text-sm font-mono overflow-x-auto">
        <pre className="text-sm leading-relaxed">
          {`curl https://api.raven.dev/v1/chat/completions \\
  -H "Authorization: Bearer rk_live_abc123def456" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4o",
    "messages": [
      {
        "role": "user",
        "content": "Hello from Raven!"
      }
    ]
  }'`}
        </pre>
      </div>
    ),
    description:
      "Use your virtual key just like a regular provider key. Point your base URL to Raven and you are all set.",
    number: 4,
    title: "Make your first API call"
  }
];

const DocsPage = () => {
  return (
    <div className="px-8 py-24">
      <div className="max-w-2xl mx-auto">
        <div className="mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Quick Start
          </h1>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            Get up and running with Raven in under 5 minutes. Follow these four
            steps to start routing your AI requests.
          </p>
        </div>

        <div className="space-y-12">
          {steps.map((step) => (
            <div className="flex gap-6" key={step.number}>
              <div className="shrink-0">
                <div className="size-10 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-sm font-bold text-primary-foreground">
                    {step.number}
                  </span>
                </div>
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <h2 className="text-xl font-semibold">{step.title}</h2>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    {step.description}
                  </p>
                </div>
                {step.content}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 rounded-xl border border-border p-6 text-center">
          <h3 className="font-semibold">Need help?</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Join our community or reach out to support for assistance.
          </p>
          <div className="flex items-center justify-center gap-3 mt-4">
            <Link
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
              href="/sign-up"
            >
              Get started free
            </Link>
            <Link
              className="px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted transition-colors"
              href="mailto:support@raven.dev"
            >
              Contact support
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocsPage;
