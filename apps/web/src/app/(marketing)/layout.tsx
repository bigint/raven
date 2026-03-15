"use client";

import { Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";
import { useSession } from "@/lib/auth-client";

const MarketingLayout = ({ children }: { children: ReactNode }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: session, isPending } = useSession();

  if (!isPending && session) {
    redirect("/overview");
  }

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
          <div className="flex items-center gap-2">
            <Link
              className="hidden rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
              href="/sign-in"
            >
              Sign in
            </Link>
            <Link
              className="hidden rounded-lg bg-foreground px-4 py-1.5 text-sm font-medium text-background transition-opacity hover:opacity-90 sm:inline-flex"
              href="/sign-up"
            >
              Get Started
            </Link>
            <button
              className="inline-flex items-center justify-center rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-foreground sm:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              type="button"
            >
              {mobileMenuOpen ? (
                <X className="size-5" />
              ) : (
                <Menu className="size-5" />
              )}
            </button>
          </div>
        </div>
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              animate={{ height: "auto", opacity: 1 }}
              className="overflow-hidden border-t border-border sm:hidden"
              exit={{ height: 0, opacity: 0 }}
              initial={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <nav className="flex flex-col gap-2 px-4 py-4">
                <Link
                  className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  href="/pricing"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Pricing
                </Link>
                <Link
                  className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  href="/docs"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Docs
                </Link>
                <Link
                  className="rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:text-foreground"
                  href="/sign-in"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign in
                </Link>
                <Link
                  className="rounded-xl bg-foreground px-4 py-2 text-center text-sm font-medium text-background transition-opacity hover:opacity-90"
                  href="/sign-up"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Get Started
                </Link>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
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
