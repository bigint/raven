import Link from "next/link";

export const HomePageContent = () => {
  return (
    <div className="mx-auto max-w-4xl px-4 py-24 text-center sm:px-6">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        Unified AI Gateway
      </h1>
      <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
        Route, monitor, and manage AI API calls across OpenAI, Anthropic,
        Google, and more.
      </p>
      <div className="mt-8 flex items-center justify-center gap-4">
        <Link
          className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
          href="/sign-up"
        >
          Get Started
        </Link>
        <Link
          className="rounded-lg border border-border px-6 py-3 text-sm font-medium hover:bg-accent transition-colors"
          href="/sign-in"
        >
          Sign In
        </Link>
      </div>
    </div>
  );
};
