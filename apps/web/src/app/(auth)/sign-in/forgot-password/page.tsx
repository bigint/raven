"use client";

import { Button } from "@raven/ui";
import Link from "next/link";
import { useState } from "react";
import { forgetPassword } from "@/lib/auth-client";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await forgetPassword({
        email,
        redirectTo: "/sign-in/reset-password"
      });
      setSubmitted(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:flex-1 bg-primary items-center justify-center">
        <div className="text-center">
          <div className="size-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-6">
            <span className="text-2xl font-bold text-primary-foreground">
              R
            </span>
          </div>
          <h2 className="text-2xl font-bold text-primary-foreground">Raven</h2>
          <p className="mt-2 text-sm text-primary-foreground/60">
            Unified AI Gateway
          </p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-sm font-bold text-primary-foreground">
                R
              </span>
            </div>
            <span className="text-lg font-semibold">Raven</span>
          </div>

          {submitted ? (
            <>
              <h1 className="text-2xl font-bold">Check your email</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                If an account exists with that email, we&apos;ve sent a password
                reset link.
              </p>
              <Link
                className="mt-6 inline-block text-sm font-medium text-primary hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                href="/sign-in"
              >
                Back to sign in
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold">Forgot password?</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter your email and we&apos;ll send you a reset link
              </p>

              {error && (
                <div
                  className="mt-4 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive"
                  role="alert"
                >
                  {error}
                </div>
              )}

              <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium" htmlFor="email">
                    Email
                  </label>
                  <input
                    autoComplete="email"
                    className="block w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm focus-visible:outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring"
                    id="email"
                    name="email"
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    spellCheck={false}
                    type="email"
                    value={email}
                  />
                </div>
                <Button
                  className="w-full rounded-lg py-2.5"
                  disabled={isLoading}
                  type="submit"
                >
                  {isLoading ? "Sending\u2026" : "Send reset link"}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                <Link
                  className="font-medium text-primary hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  href="/sign-in"
                >
                  Back to sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
