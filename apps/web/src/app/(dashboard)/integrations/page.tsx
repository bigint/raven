"use client";

import { PageHeader, Tabs } from "@raven/ui";
import { Check, Copy } from "lucide-react";
import { useCallback, useState } from "react";

type AgentTab = "claude-code" | "cursor" | "windsurf" | "codex" | "shell";

const TABS = [
  { label: "Claude Code", value: "claude-code" },
  { label: "Cursor", value: "cursor" },
  { label: "Windsurf", value: "windsurf" },
  { label: "Codex", value: "codex" },
  { label: "Shell", value: "shell" }
] as const;

const SNIPPETS: Record<AgentTab, string> = {
  "claude-code": `{
  "apiKeyHelper": "echo $RAVEN_API_KEY",
  "env": {
    "ANTHROPIC_BASE_URL": "https://your-raven-instance.com/v1/proxy/anthropic"
  }
}`,
  codex: `export OPENAI_BASE_URL="https://your-raven-instance.com/v1/proxy/openai"
export OPENAI_API_KEY="rk_live_your_key_here"`,
  cursor: `Base URL: https://your-raven-instance.com/v1/proxy/openai
API Key: rk_live_your_key_here`,
  shell: `export OPENAI_BASE_URL="https://your-raven-instance.com/v1/proxy/openai"
export OPENAI_API_KEY="rk_live_your_key_here"

# Or for Anthropic
export ANTHROPIC_BASE_URL="https://your-raven-instance.com/v1/proxy/anthropic"
export ANTHROPIC_API_KEY="rk_live_your_key_here"`,
  windsurf: `Base URL: https://your-raven-instance.com/v1/proxy/openai
API Key: rk_live_your_key_here`
};

const CodeBlock = ({ content }: { content: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  return (
    <div className="relative rounded-lg border border-border bg-muted/50">
      <button
        className="absolute right-3 top-3 rounded-md border border-border bg-background p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        onClick={handleCopy}
        title="Copy to clipboard"
        type="button"
      >
        {copied ? (
          <Check className="size-4 text-green-500" />
        ) : (
          <Copy className="size-4" />
        )}
      </button>
      <pre className="overflow-x-auto p-4 pr-14 text-sm leading-relaxed">
        <code>{content}</code>
      </pre>
    </div>
  );
};

const IntegrationsPage = () => {
  const [tab, setTab] = useState<AgentTab>("claude-code");

  return (
    <div>
      <PageHeader
        description="Configure your AI coding agents to use Raven as their gateway."
        title="Integrations"
      />
      <Tabs
        onChange={(v) => setTab(v as AgentTab)}
        tabs={[...TABS]}
        value={tab}
      />
      <CodeBlock content={SNIPPETS[tab]} />
    </div>
  );
};

export default IntegrationsPage;
