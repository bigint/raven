import Link from "next/link";
import type { ReactNode } from "react";
import { AuthNav } from "./components/auth-nav";

const MarketingLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-8">
            <Link className="flex items-center gap-2.5" href="/">
              <div className="flex size-8 items-center justify-center rounded-lg bg-foreground">
                <span className="text-sm font-bold text-background">R</span>
              </div>
              <span className="text-lg font-semibold">Raven</span>
            </Link>
            <nav className="hidden items-center gap-1 sm:flex">
              <Link
                className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                href="/pricing"
              >
                Pricing
              </Link>
              <Link
                className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                href="/docs"
              >
                Docs
              </Link>
            </nav>
          </div>
          <AuthNav />
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            <div className="col-span-2 sm:col-span-1">
              <div className="flex items-center gap-2.5">
                <div className="flex size-7 items-center justify-center rounded-md bg-foreground">
                  <span className="text-xs font-bold text-background">R</span>
                </div>
                <span className="font-semibold">Raven</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Unified AI gateway for teams that need control and visibility.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium">Product</h4>
              <ul className="mt-3 space-y-2">
                <li>
                  <Link
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    href="/pricing"
                  >
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    href="/docs"
                  >
                    Documentation
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-medium">Resources</h4>
              <ul className="mt-3 space-y-2">
                <li>
                  <Link
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    href="/docs"
                  >
                    Quick Start
                  </Link>
                </li>
                <li>
                  <Link
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    href="/sign-up"
                  >
                    Get Started
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-medium">Legal</h4>
              <ul className="mt-3 space-y-2">
                <li>
                  <Link
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    href="/privacy"
                  >
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    href="/terms"
                  >
                    Terms
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-10 border-t border-border pt-6 text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Raven. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MarketingLayout;
