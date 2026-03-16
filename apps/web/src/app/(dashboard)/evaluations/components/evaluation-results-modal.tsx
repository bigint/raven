"use client";

import { Badge, Modal } from "@raven/ui";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Evaluation, EvaluationResult } from "../hooks/use-evaluations";

interface EvaluationResultsModalProps {
  evaluation: Evaluation | null;
  open: boolean;
  onClose: () => void;
}

const EvaluationResultsModal = ({
  evaluation,
  open,
  onClose
}: EvaluationResultsModalProps) => {
  const { data, isLoading } = useQuery({
    enabled: open && !!evaluation,
    queryFn: () =>
      api.get<Evaluation & { results: EvaluationResult[] }>(
        `/v1/evaluations/${evaluation?.id}`
      ),
    queryKey: ["evaluation-detail", evaluation?.id]
  });

  const results = data?.results ?? [];

  return (
    <Modal
      onClose={onClose}
      open={open}
      title={`Results: ${evaluation?.name ?? "Evaluation"}`}
    >
      <div className="space-y-4">
        {/* Summary */}
        {data && (
          <div className="flex items-center gap-4 rounded-md border border-border p-3">
            <div>
              <span className="text-xs text-muted-foreground">Score</span>
              <p className="text-lg font-semibold">
                {data.score ? `${(Number(data.score) * 100).toFixed(1)}%` : "—"}
              </p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Passed</span>
              <p className="text-lg font-semibold text-green-600">
                {data.passCount}
              </p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Failed</span>
              <p className="text-lg font-semibold text-red-600">
                {data.failCount}
              </p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Evaluator</span>
              <p className="text-sm font-medium">{data.evaluatorType}</p>
            </div>
          </div>
        )}

        {/* Results list */}
        {isLoading && (
          <p className="text-sm text-muted-foreground">Loading results...</p>
        )}

        {results.length === 0 && !isLoading && (
          <p className="text-sm text-muted-foreground">
            No results yet. Run the evaluation to see results.
          </p>
        )}

        <div className="max-h-80 space-y-3 overflow-y-auto">
          {results.map((result, idx) => (
            <div
              className="rounded-md border border-border p-3 space-y-2"
              key={result.id}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Sample {idx + 1}
                </span>
                <Badge
                  dot
                  variant={result.passed === "true" ? "success" : "error"}
                >
                  {result.passed === "true" ? "Pass" : "Fail"}
                </Badge>
              </div>

              <div>
                <span className="text-xs text-muted-foreground">Input</span>
                <p className="text-sm mt-0.5 line-clamp-2">{result.input}</p>
              </div>

              {result.actualOutput && (
                <div>
                  <span className="text-xs text-muted-foreground">Output</span>
                  <p className="text-sm mt-0.5 line-clamp-2">
                    {result.actualOutput}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-3">
                {result.score && (
                  <span className="text-xs text-muted-foreground">
                    Score:{" "}
                    <span className="font-mono text-foreground">
                      {(Number(result.score) * 100).toFixed(1)}%
                    </span>
                  </span>
                )}
                {result.feedback && (
                  <span className="text-xs text-muted-foreground">
                    {result.feedback}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};

export { EvaluationResultsModal };
