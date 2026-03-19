"use client";

import { Badge } from "@raven/ui";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

interface ResponseMeta {
  readonly provider?: string;
  readonly model?: string;
  readonly latencyMs?: number;
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  readonly cost?: number;
  readonly cacheHit?: boolean;
  readonly guardrailWarnings?: string[];
  readonly routingStrategy?: string;
  readonly taskType?: string;
  readonly toolCalls?: number;
}

interface ResponseMetadataProps {
  readonly meta: ResponseMeta;
  readonly show: boolean;
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
          {meta.routingStrategy && (
            <Badge variant="info">route: {meta.routingStrategy}</Badge>
          )}
          {meta.taskType && <Badge variant="info">task: {meta.taskType}</Badge>}
          {meta.toolCalls !== undefined && meta.toolCalls > 0 && (
            <Badge variant="neutral">
              {meta.toolCalls} tool call{meta.toolCalls > 1 ? "s" : ""}
            </Badge>
          )}
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
