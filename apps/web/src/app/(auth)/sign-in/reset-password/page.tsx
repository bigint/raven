"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useState } from "react";
import { resetPassword } from "@/lib/auth-client";

const ResetPasswordForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!token) {
    return (
      <>
        <h1 className="text-2xl font-bold">Invalid reset link</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This password reset link is invalid or has expired.
        </p>
        <Link
          className="mt-6 inline-block text-sm font-medium text-primary hover:underline"
          href="/sign-in/forgot-password"
        >
          Request a new link
        </Link>
      </>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      await resetPassword({ newPassword: password, token });
      router.push("/sign-in");
    } catch {
      setError("Failed to reset password. The link may have expired.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <h1 className="text-2xl font-bold">Set new password</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Choose a new password for your account
      </p>

      {error && (
        <div className="mt-4 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium" htmlFor="password">
            New password
          </label>
          <input
            className="block w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring"
            id="password"
            minLength={8}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 8 characters"
            required
            type="password"
            value={password}
          />
        </div>
        <div className="space-y-1.5">
          <label
            className="block text-sm font-medium"
            htmlFor="confirmPassword"
          >
            Confirm password
          </label>
          <input
            className="block w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring"
            id="confirmPassword"
            minLength={8}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your password"
            required
            type="password"
            value={confirmPassword}
          />
        </div>
        <button
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
          disabled={isLoading}
          type="submit"
        >
          {isLoading ? "Resetting..." : "Reset password"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link
          className="font-medium text-primary hover:underline"
          href="/sign-in"
        >
          Back to sign in
        </Link>
      </p>
    </>
  );
};

const ResetPasswordPage = () => {
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
            Unified AI Gateway for Teams
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

          <Suspense>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
