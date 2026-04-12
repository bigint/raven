"use client";

import { Badge, Button } from "@raven/ui";
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
  readonly knowledgeCollections?: string[];
  readonly knowledgeChunks?: number;
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
      <Button
        className="text-[10px] px-0 py-0 h-auto"
        onClick={() => setExpanded(!expanded)}
        variant="ghost"
      >
        {expanded ? (
          <ChevronDown className="size-3" />
        ) : (
          <ChevronRight className="size-3" />
        )}
        Request Details
      </Button>

      {expanded && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {meta.provider && <Badge variant="outline">{meta.provider}</Badge>}
          {meta.model && <Badge variant="outline">{meta.model}</Badge>}
          {meta.latencyMs !== undefined && (
            <Badge variant="outline">{meta.latencyMs}ms</Badge>
          )}
          {meta.inputTokens !== undefined && (
            <Badge variant="outline">
              {meta.inputTokens}&#8594;{meta.outputTokens ?? 0} tokens
            </Badge>
          )}
          {meta.cost !== undefined && meta.cost > 0 && (
            <Badge variant="outline">${meta.cost.toFixed(4)}</Badge>
          )}
          {meta.cacheHit && <Badge variant="solid">cached</Badge>}
          {meta.routingStrategy && (
            <Badge variant="solid">route: {meta.routingStrategy}</Badge>
          )}
          {meta.taskType && (
            <Badge variant="solid">task: {meta.taskType}</Badge>
          )}
          {meta.toolCalls !== undefined && meta.toolCalls > 0 && (
            <Badge variant="outline">
              {meta.toolCalls} tool call{meta.toolCalls > 1 ? "s" : ""}
            </Badge>
          )}
          {meta.knowledgeCollections &&
            meta.knowledgeCollections.length > 0 && (
              <Badge variant="solid">
                RAG: {meta.knowledgeCollections.join(", ")} (
                {meta.knowledgeChunks ?? 0} chunks)
              </Badge>
            )}
          {meta.guardrailWarnings && meta.guardrailWarnings.length > 0 && (
            <Badge variant="subtle">
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
