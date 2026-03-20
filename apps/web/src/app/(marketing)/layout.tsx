import Link from "next/link";
import type { ReactNode } from "react";

const MarketingLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link className="flex items-center gap-2.5" href="/">
            <div className="flex size-8 items-center justify-center rounded-lg bg-foreground">
              <span className="text-sm font-bold text-background">R</span>
            </div>
            <span className="text-lg font-semibold">Raven</span>
          </Link>
          <div className="flex items-center gap-4">
            <a
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              href="https://github.com/bigint/raven"
              rel="noopener noreferrer"
              target="_blank"
            >
              GitHub
            </a>
            <Link
              className="rounded-lg border border-border px-4 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
              href="/sign-in"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 sm:px-6">
          <span className="text-sm text-muted-foreground">
            Raven — Open-source AI model gateway
          </span>
          <a
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            href="https://github.com/bigint/raven"
            rel="noopener noreferrer"
            target="_blank"
          >
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
};

export default MarketingLayout;
