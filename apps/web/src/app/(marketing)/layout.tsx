import Link from "next/link";

export default function MarketingLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-8 py-4 border-b border-border">
        <div className="flex items-center gap-6">
          <Link className="flex items-center gap-2" href="/">
            <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-sm font-bold text-primary-foreground">
                R
              </span>
            </div>
            <span className="text-lg font-semibold">Raven</span>
          </Link>
          <nav className="hidden sm:flex items-center gap-4">
            <Link
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
              href="/pricing"
            >
              Pricing
            </Link>
            <Link
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
              href="/docs"
            >
              Docs
            </Link>
          </nav>
        </div>
        <nav className="flex items-center gap-3">
          <Link
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            href="/sign-in"
          >
            Sign in
          </Link>
          <Link
            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
            href="/sign-up"
          >
            Get Started
          </Link>
        </nav>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border px-8 py-6 text-center text-sm text-muted-foreground">
        &copy; 2026 Raven. All rights reserved.
      </footer>
    </div>
  );
}
