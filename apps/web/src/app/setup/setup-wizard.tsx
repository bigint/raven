"use client";

import { Button } from "@raven/ui";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { api } from "@/lib/api";
import { signIn } from "@/lib/auth-client";

export const SetupWizard = () => {
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
      await api.post("/v1/setup/complete", { email, name, password });
      await signIn.email({ email, password });
      router.push("/overview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete setup");
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

          <h1 className="text-2xl font-bold">Create admin account</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Set up the first administrator for your Raven instance
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
              <label className="block text-sm font-medium" htmlFor="name">
                Name
              </label>
              <input
                className="block w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring"
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
                className="block w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring"
                id="email"
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
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
                className="block w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring"
                id="password"
                minLength={8}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                required
                type="password"
                value={password}
              />
            </div>
            <Button
              className="w-full rounded-lg py-2.5"
              disabled={isLoading}
              type="submit"
            >
              {isLoading ? "Setting up..." : "Complete Setup"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
