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
            <nav className="hidden items-center gap-1 sm:flex" />
          </div>
          <AuthNav />
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-md bg-foreground">
              <span className="text-xs font-bold text-background">R</span>
            </div>
            <span className="font-semibold">Raven</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Unified AI gateway that gives you control and visibility over your AI usage.
          </p>
          <div className="mt-10 border-t border-border pt-6 text-center text-sm text-muted-foreground">
            &copy; {2026} Raven. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MarketingLayout;
