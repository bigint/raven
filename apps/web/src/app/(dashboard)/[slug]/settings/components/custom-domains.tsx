"use client";

import { Badge, Button, Input, Spinner } from "@raven/ui";
import { Copy, Globe, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { TextMorph } from "torph/react";
import {
  type CustomDomain,
  useCustomDomains
} from "../hooks/use-custom-domains";

const STATUS_CONFIG: Record<
  CustomDomain["status"],
  { label: string; variant: "success" | "warning" | "error" | "neutral" }
> = {
  active: { label: "Active", variant: "success" },
  failed: { label: "Failed", variant: "error" },
  pending_verification: { label: "Pending", variant: "warning" },
  verified: { label: "Verified", variant: "neutral" }
};

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
  toast.success("Copied to clipboard");
};

const DomainRow = ({
  domain,
  onVerify,
  onDelete,
  verifying,
  deleting
}: {
  domain: CustomDomain;
  onVerify: (id: string) => void;
  onDelete: (id: string) => void;
  verifying: boolean;
  deleting: boolean;
}) => {
  const status = STATUS_CONFIG[domain.status];
  const txtRecord = `_raven-verify.${domain.domain}`;
  const txtValue = `raven-verification=${domain.verificationToken}`;
  const needsVerification =
    domain.status === "pending_verification" || domain.status === "failed";

  return (
    <div className="space-y-3 rounded-md border border-border bg-muted/30 px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-hidden">
          <Globe className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate text-sm font-medium">{domain.domain}</span>
          <Badge dot variant={status.variant}>
            {status.label}
          </Badge>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {needsVerification && (
            <Button
              disabled={verifying}
              onClick={() => onVerify(domain.id)}
              size="sm"
              variant="secondary"
            >
              <TextMorph>{verifying ? "Verifying..." : "Verify"}</TextMorph>
            </Button>
          )}
          <Button
            disabled={deleting}
            onClick={() => onDelete(domain.id)}
            size="sm"
            variant="destructive"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {needsVerification && (
        <div className="space-y-2 rounded-md border border-border bg-background px-3 py-3">
          <p className="text-xs font-medium text-muted-foreground">
            1. Add this TXT record to your DNS:
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-auto rounded bg-muted px-2 py-1 text-xs">
              {txtRecord}
            </code>
            <button
              className="shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => copyToClipboard(txtRecord)}
              type="button"
            >
              <Copy className="size-3.5" />
            </button>
          </div>
          <p className="text-xs font-medium text-muted-foreground">Value:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-auto rounded bg-muted px-2 py-1 text-xs">
              {txtValue}
            </code>
            <button
              className="shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => copyToClipboard(txtValue)}
              type="button"
            >
              <Copy className="size-3.5" />
            </button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            2. After DNS propagates, click Verify above.
          </p>
          <p className="text-xs text-muted-foreground">
            3. Then add a CNAME record:{" "}
            <code className="rounded bg-muted px-1">{domain.domain}</code> →{" "}
            <code className="rounded bg-muted px-1">proxy.ravenai.app</code>
          </p>
        </div>
      )}

      {domain.status === "active" && (
        <p className="text-xs text-muted-foreground">
          Proxy URL:{" "}
          <code className="rounded bg-muted px-1">
            https://{domain.domain}/v1/openai/chat/completions
          </code>
        </p>
      )}
    </div>
  );
};

interface CustomDomainsProps {
  plan: string;
}

export const CustomDomains = ({ plan }: CustomDomainsProps) => {
  const {
    domains,
    isLoading,
    addDomain,
    adding,
    verifyDomain,
    verifying,
    deleteDomain,
    deleting
  } = useCustomDomains();

  const [newDomain, setNewDomain] = useState("");
  const isPaidPlan = plan !== "free";

  const handleAdd = () => {
    const trimmed = newDomain.trim().toLowerCase();
    if (!trimmed) return;
    addDomain(trimmed, { onSuccess: () => setNewDomain("") });
  };

  return (
    <div className="rounded-xl border border-border">
      <div className="flex items-center gap-3 border-b border-border px-4 py-4 sm:px-6">
        <div className="rounded-lg bg-primary/10 p-2">
          <Globe className="size-4 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-semibold">Custom Domains</h2>
          <p className="text-xs text-muted-foreground">
            Use your own domain for the AI proxy endpoint
          </p>
        </div>
        <Badge className="ml-auto" variant="primary">
          Pro
        </Badge>
      </div>

      <div className="px-4 py-4 sm:px-6 sm:py-5">
        {isPaidPlan ? (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                disabled={adding}
                onChange={(e) => setNewDomain(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd();
                }}
                placeholder="ai.example.com"
                value={newDomain}
              />
              <Button
                disabled={adding || !newDomain.trim()}
                onClick={handleAdd}
                variant="secondary"
              >
                {adding ? (
                  <Spinner className="size-4" />
                ) : (
                  <Plus className="size-4" />
                )}
                Add
              </Button>
            </div>

            {isLoading ? (
              <div className="py-6 text-center">
                <Spinner className="mx-auto" />
              </div>
            ) : domains.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No custom domains configured.
              </p>
            ) : (
              <div className="space-y-3">
                {domains.map((d) => (
                  <DomainRow
                    deleting={deleting}
                    domain={d}
                    key={d.id}
                    onDelete={deleteDomain}
                    onVerify={verifyDomain}
                    verifying={verifying}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-md border border-border bg-muted/30 px-4 py-6 text-center">
            <Globe className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-2 text-sm font-medium">
              Custom domains require a Pro plan or above
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Upgrade your plan to use your own domain for the proxy endpoint.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
