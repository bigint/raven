"use client";

import { Badge } from "@raven/ui";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

interface ResponseMeta {
  provider?: string;
  model?: string;
  latencyMs?: number;
  inputTokens?: number;
  outputTokens?: number;
  cost?: number;
  cacheHit?: boolean;
  guardrailWarnings?: string[];
}

interface ResponseMetadataProps {
  meta: ResponseMeta;
  show: boolean;
}

const ResponseMetadata = ({ meta, show }: ResponseMetadataProps) => {
  const [expanded, setExpanded] = useState(false);

  if (!show || Object.keys(meta).length === 0) return null;

  return (
    <div className="mt-1.5">
      <button
        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setExpanded(!expanded)}
        type="button"
      >
        {expanded ? (
          <ChevronDown className="size-3" />
        ) : (
          <ChevronRight className="size-3" />
        )}
        Request Details
      </button>

      {expanded && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {meta.provider && <Badge variant="neutral">{meta.provider}</Badge>}
          {meta.model && <Badge variant="neutral">{meta.model}</Badge>}
          {meta.latencyMs !== undefined && (
            <Badge variant="neutral">{meta.latencyMs}ms</Badge>
          )}
          {meta.inputTokens !== undefined && (
            <Badge variant="neutral">
              {meta.inputTokens}&#8594;{meta.outputTokens ?? 0} tokens
            </Badge>
          )}
          {meta.cost !== undefined && meta.cost > 0 && (
            <Badge variant="neutral">${meta.cost.toFixed(4)}</Badge>
          )}
          {meta.cacheHit && <Badge variant="success">cached</Badge>}
          {meta.guardrailWarnings && meta.guardrailWarnings.length > 0 && (
            <Badge variant="warning">
              {meta.guardrailWarnings.length} guardrail warning(s)
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};

export type { ResponseMeta };
export { ResponseMetadata };
