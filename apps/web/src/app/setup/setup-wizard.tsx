"use client";

import { Button } from "@raven/ui";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { api } from "@/lib/api";

interface SetupData {
  email: string;
  instanceName: string;
  name: string;
  password: string;
}

export const SetupWizard = () => {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<SetupData>({
    email: "",
    instanceName: "Raven",
    name: "",
    password: ""
  });

  const updateField = (field: keyof SetupData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setStep(2);
  };

  const handleBack = () => {
    setError("");
    setStep(1);
  };

  const handleComplete = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await api.post("/v1/setup/complete", {
        email: data.email,
        instanceName: data.instanceName || undefined,
        name: data.name,
        password: data.password
      });
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

          <div className="mb-6 flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div
                className={`flex size-6 items-center justify-center rounded-full text-xs font-medium ${
                  step >= 1
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                1
              </div>
              <span className="text-sm font-medium">Account</span>
            </div>
            <div className="h-px flex-1 bg-border" />
            <div className="flex items-center gap-2">
              <div
                className={`flex size-6 items-center justify-center rounded-full text-xs font-medium ${
                  step >= 2
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                2
              </div>
              <span className="text-sm font-medium">Instance</span>
            </div>
          </div>

          {step === 1 ? (
            <>
              <h1 className="text-2xl font-bold">Create admin account</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                This will be the first administrator of your Raven instance
              </p>

              {error && (
                <div
                  className="mt-4 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive"
                  role="alert"
                >
                  {error}
                </div>
              )}

              <form className="mt-8 space-y-4" onSubmit={handleNext}>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium" htmlFor="name">
                    Name
                  </label>
                  <input
                    className="block w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring"
                    id="name"
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="John Doe"
                    required
                    type="text"
                    value={data.name}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium" htmlFor="email">
                    Email
                  </label>
                  <input
                    className="block w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring"
                    id="email"
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="admin@example.com"
                    required
                    type="email"
                    value={data.email}
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    className="block text-sm font-medium"
                    htmlFor="password"
                  >
                    Password
                  </label>
                  <input
                    className="block w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring"
                    id="password"
                    minLength={8}
                    onChange={(e) => updateField("password", e.target.value)}
                    placeholder="Min. 8 characters"
                    required
                    type="password"
                    value={data.password}
                  />
                </div>
                <Button className="w-full rounded-lg py-2.5" type="submit">
                  Next
                </Button>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold">Name your instance</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose a name for your Raven instance
              </p>

              {error && (
                <div
                  className="mt-4 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive"
                  role="alert"
                >
                  {error}
                </div>
              )}

              <form className="mt-8 space-y-4" onSubmit={handleComplete}>
                <div className="space-y-1.5">
                  <label
                    className="block text-sm font-medium"
                    htmlFor="instanceName"
                  >
                    Instance name
                  </label>
                  <input
                    className="block w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring"
                    id="instanceName"
                    onChange={(e) =>
                      updateField("instanceName", e.target.value)
                    }
                    placeholder="Raven"
                    required
                    type="text"
                    value={data.instanceName}
                  />
                  <p className="text-xs text-muted-foreground">
                    This appears in emails and across the dashboard
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button
                    className="flex-1 rounded-lg py-2.5"
                    onClick={handleBack}
                    type="button"
                    variant="secondary"
                  >
                    Back
                  </Button>
                  <Button
                    className="flex-1 rounded-lg py-2.5"
                    disabled={isLoading}
                    type="submit"
                  >
                    {isLoading ? "Setting up..." : "Complete Setup"}
                  </Button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
