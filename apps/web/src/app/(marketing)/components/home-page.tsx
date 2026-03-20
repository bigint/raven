import Link from "next/link";

const features = [
  "Unified API for OpenAI, Anthropic, Google, Mistral, and more",
  "Smart routing and load balancing across providers",
  "Cost tracking, budgets, and detailed analytics",
  "Content guardrails and safety controls",
  "Request logging and audit trails"
];

export const HomePageContent = () => {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 sm:px-6">
      <div className="text-center">
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
          Raven
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Open-source AI model gateway
        </p>
      </div>

      <ul className="mt-12 space-y-3">
        {features.map((feature) => (
          <li
            className="flex items-start gap-3 text-muted-foreground"
            key={feature}
          >
            <span className="mt-1.5 block size-1.5 shrink-0 rounded-full bg-foreground" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <div className="mt-12 flex items-center justify-center gap-4">
        <Link
          className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          href="/sign-in"
        >
          Get Started
        </Link>
        <a
          className="rounded-lg border border-border px-6 py-3 text-sm font-medium transition-colors hover:bg-accent"
          href="https://github.com/bigint/raven"
          rel="noopener noreferrer"
          target="_blank"
        >
          View on GitHub
        </a>
      </div>
    </div>
  );
};
