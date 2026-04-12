"use client";

import { Button, Input, Spinner, Switch } from "@raven/ui";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAdminSettings, useUpdateSettings } from "../hooks/use-admin";

export const KnowledgeSettingsTab = () => {
  const { data: settings, isPending, error } = useAdminSettings();
  const updateSettings = useUpdateSettings();

  const [enabled, setEnabled] = useState(false);
  const [url, setUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<
    { ok: true; version: string } | { ok: false; message: string } | null
  >(null);

  useEffect(() => {
    if (!settings) return;
    setEnabled(settings.knowledge_enabled === "true");
    setUrl(settings.bigrag_url || "");
    setApiKey(settings.bigrag_api_key || "");
    setTestResult(null);
  }, [settings]);

  if (error) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {error.message}
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
      </div>
    );
  }

  const initialEnabled = settings.knowledge_enabled === "true";
  const initialUrl = settings.bigrag_url || "";
  const initialKey = settings.bigrag_api_key || "";
  const keyIsPlaceholder = apiKey.includes("••••");

  const hasChanges =
    enabled !== initialEnabled ||
    url !== initialUrl ||
    (apiKey !== initialKey && !keyIsPlaceholder);

  const save = () => {
    const payload: Record<string, string> = {
      bigrag_url: url,
      knowledge_enabled: enabled ? "true" : "false"
    };
    // Only send the key if the user actually typed a new one.
    if (!keyIsPlaceholder) payload.bigrag_api_key = apiKey;
    updateSettings.mutate(payload);
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      // Persist first so the test uses the exact values the user typed.
      if (hasChanges)
        await updateSettings.mutateAsync({
          bigrag_api_key: keyIsPlaceholder
            ? settings.bigrag_api_key || ""
            : apiKey,
          bigrag_url: url,
          knowledge_enabled: enabled ? "true" : "false"
        });
      const health = await api.post<{ status: string; version: string }>(
        "/v1/admin/settings/bigrag-test"
      );
      setTestResult({ ok: true, version: health.version });
      toast.success(`Connected — bigRAG v${health.version}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Connection failed";
      setTestResult({ message, ok: false });
      toast.error(message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-start gap-3 rounded-md border border-border bg-muted/40 p-4">
        <div className="mt-0.5">
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>
        <div className="flex-1">
          <div className="font-medium">Enable RAG (Knowledge)</div>
          <p className="text-xs text-muted-foreground mt-1">
            Injects retrieved context into chat completions and exposes the
            /v1/knowledge API. When disabled, Raven returns 503 for knowledge
            routes and hides the Knowledge nav.
          </p>
        </div>
      </div>

      <Input
        autoComplete="off"
        description="Base URL of the bigRAG server, e.g. http://bigrag:6100"
        label="bigRAG URL"
        name="bigragUrl"
        onChange={(e) => setUrl(e.target.value)}
        placeholder="http://localhost:6100"
        type="url"
        value={url}
      />

      <Input
        autoComplete="off"
        description="API key minted from the bigRAG Studio → API Keys page. Starts with bigrag_sk_."
        label="bigRAG API key"
        name="bigragApiKey"
        onChange={(e) => {
          setApiKey(e.target.value);
          setTestResult(null);
        }}
        placeholder="bigrag_sk_..."
        type="password"
        value={apiKey}
      />

      {testResult?.ok && (
        <div className="flex items-center gap-2 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
          <CheckCircle2 className="size-4" />
          Connected — bigRAG v{testResult.version}
        </div>
      )}
      {testResult && !testResult.ok && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertTriangle className="size-4" />
          {testResult.message}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button
          disabled={!hasChanges || updateSettings.isPending}
          onClick={save}
        >
          {updateSettings.isPending ? "Saving…" : "Save settings"}
        </Button>
        <Button
          disabled={testing || !enabled || !url}
          onClick={testConnection}
          variant="ghost"
        >
          {testing ? "Testing…" : "Test connection"}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Changes to the bigRAG URL or API key take effect on the next request.
        Toggling RAG on/off requires a server restart for route registration to
        update.
      </p>
    </div>
  );
};
