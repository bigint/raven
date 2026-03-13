"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { signUp } from "@/lib/auth-client";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await signUp.email({ email, name, password });
      router.push("/onboarding");
    } catch {
      setError("Failed to create account");
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

          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Get started with Raven for free
          </p>

          {error && (
            <div className="mt-4 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium" htmlFor="name">
                Name
              </label>
              <input
                className="block w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring"
                id="name"
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required
                type="text"
                value={name}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium" htmlFor="email">
                Email
              </label>
              <input
                className="block w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring"
                id="email"
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                type="email"
                value={email}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium" htmlFor="password">
                Password
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
            <button
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
              disabled={isLoading}
              type="submit"
            >
              {isLoading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              className="font-medium text-primary hover:underline"
              href="/sign-in"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
