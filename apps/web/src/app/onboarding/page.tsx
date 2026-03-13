"use client";

import { PROVIDER_OPTIONS } from "@raven/types";
import { Button, Input, Select } from "@raven/ui";
import {
  ArrowRight,
  Building2,
  Check,
  Copy,
  Eye,
  EyeOff,
  Key,
  Loader2,
  Plug,
  X
} from "lucide-react";
import { useOnboarding } from "./hooks/use-onboarding";

const STEPS = [
  { icon: Building2, label: "Organization" },
  { icon: Plug, label: "Provider" },
  { icon: Key, label: "API Key" }
];

const OnboardingPage = () => {
  const {
    copied,
    error,
    generatedKey,
    handleAddProvider,
    handleCopy,
    handleCreateKey,
    handleCreateOrg,
    handleFinish,
    handleSkipProvider,
    hasExistingOrg,
    isPending,
    keyName,
    navigateToOverview,
    navigateToSignIn,
    orgName,
    provider,
    providerApiKey,
    providerName,
    session,
    setKeyName,
    setOrgName,
    setProvider,
    setProviderApiKey,
    setProviderName,
    setShowProviderKey,
    showProviderKey,
    step,
    submitting
  } = useOnboarding();

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    navigateToSignIn();
    return null;
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4">
      {/* Top bar — logo + close */}
      {hasExistingOrg && (
        <div className="fixed inset-x-0 top-0 z-10 flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-primary-foreground">
                R
              </span>
            </div>
            <span className="text-sm font-semibold">Raven</span>
          </div>
          <button
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            onClick={navigateToOverview}
            type="button"
          >
            <X className="size-5" />
          </button>
        </div>
      )}

      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-8 text-center">
          {!hasExistingOrg && (
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary">
              <span className="text-lg font-bold text-primary-foreground">
                R
              </span>
            </div>
          )}
          <h1 className="text-2xl font-bold">
            {hasExistingOrg
              ? "Create a new organization"
              : "Set up your workspace"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Get started with Raven in a few quick steps
          </p>
        </div>

        {/* Step indicators */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === step;
            const isDone = i < step;
            return (
              <div className="flex items-center gap-2" key={s.label}>
                {i > 0 && (
                  <div
                    className={`h-px w-8 ${isDone ? "bg-primary" : "bg-border"}`}
                  />
                )}
                <div
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : isDone
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isDone ? (
                    <Check className="size-3" />
                  ) : (
                    <Icon className="size-3" />
                  )}
                  {s.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Card */}
        <div className="rounded-xl border border-border p-6">
          {error && (
            <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Step 1: Create Organization */}
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold">
                  Name your organization
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  This is your team's workspace in Raven.
                </p>
              </div>
              <Input
                id="org-name"
                label="Organization Name"
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="e.g. Acme Inc"
                value={orgName}
              />
              <div className="flex justify-end">
                <Button
                  disabled={submitting || !orgName.trim()}
                  onClick={handleCreateOrg}
                >
                  {submitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Add Provider */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold">
                  Connect an AI provider
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add your first provider API key to start routing requests.
                </p>
              </div>
              <div>
                <label
                  className="mb-1 block text-sm font-medium"
                  htmlFor="provider-select"
                >
                  Provider
                </label>
                <Select
                  id="provider-select"
                  onChange={setProvider}
                  options={PROVIDER_OPTIONS}
                  value={provider}
                />
              </div>
              <Input
                description="Optional"
                id="provider-name"
                label="Name"
                onChange={(e) => setProviderName(e.target.value)}
                placeholder={`e.g. Production ${PROVIDER_OPTIONS.find((p) => p.value === provider)?.label ?? ""}`}
                value={providerName}
              />
              <div>
                <label
                  className="mb-1 block text-sm font-medium"
                  htmlFor="provider-key"
                >
                  API Key
                </label>
                <div className="relative">
                  <input
                    className="w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                    id="provider-key"
                    onChange={(e) => setProviderApiKey(e.target.value)}
                    placeholder="sk-..."
                    type={showProviderKey ? "text" : "password"}
                    value={providerApiKey}
                  />
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    onClick={() => setShowProviderKey((v) => !v)}
                    tabIndex={-1}
                    type="button"
                  >
                    {showProviderKey ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="flex justify-between">
                <Button onClick={handleSkipProvider} variant="secondary">
                  Skip for now
                </Button>
                <Button
                  disabled={submitting || !providerApiKey.trim()}
                  onClick={handleAddProvider}
                >
                  {submitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Create API Key */}
          {step === 2 && !generatedKey && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold">Create your API key</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Generate a virtual key to authenticate your requests through
                  Raven.
                </p>
              </div>
              <Input
                id="key-name"
                label="Key Name"
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="e.g. Default"
                value={keyName}
              />
              <div className="flex justify-between">
                <Button onClick={handleFinish} variant="secondary">
                  Skip for now
                </Button>
                <Button
                  disabled={submitting || !keyName.trim()}
                  onClick={handleCreateKey}
                >
                  {submitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      Generate Key
                      <Key className="size-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Show Generated Key */}
          {step === 2 && generatedKey && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold">Your API key is ready</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Copy this key now. You won't be able to see it again.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2.5">
                <code className="flex-1 truncate text-sm">{generatedKey}</code>
                <button
                  className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                  onClick={handleCopy}
                  type="button"
                >
                  {copied ? (
                    <Check className="size-4 text-green-500" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </button>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-xs font-medium">Quick start</p>
                <code className="mt-2 block whitespace-pre-wrap rounded-md bg-background px-3 py-2 text-xs">
                  {`curl ${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/v1/proxy/openai/chat/completions \\
  -H "Authorization: Bearer ${generatedKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Hello"}]}'`}
                </code>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleFinish}>
                  Go to Dashboard
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
