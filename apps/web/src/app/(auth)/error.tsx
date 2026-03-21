"use client";

import { Button } from "@raven/ui";
import Link from "next/link";

const AuthError = ({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) => {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center">
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button onClick={reset}>Try again</Button>
          <Link
            className="rounded-lg border border-input px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
            href="/sign-in"
          >
            Back to Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AuthError;
