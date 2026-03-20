"use client";

import Link from "next/link";

export const AuthNav = () => {
  return (
    <div className="flex items-center gap-3">
      <Link
        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        href="/sign-in"
      >
        Sign in
      </Link>
      <Link
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
        href="/sign-up"
      >
        Get Started
      </Link>
    </div>
  );
};
