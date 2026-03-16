import type { Database } from "@raven/db";
import { evaluationResults, evaluations } from "@raven/db";
import { and, eq } from "drizzle-orm";
import type { z } from "zod";
import { NotFoundError } from "@/lib/errors";
import { publishEvent } from "@/lib/events";
import { success } from "@/lib/response";
import type { AppContextWithJson } from "@/lib/types";
import {
  evaluateCoherence,
  evaluatePIILeakage,
  evaluateRelevance,
  evaluateToxicity
} from "./evaluators";
import type { runEvaluationSchema } from "./schema";

type Body = z.infer<typeof runEvaluationSchema>;

const EVALUATOR_MAP = {
  coherence: (_prompt: string, response: string) => evaluateCoherence(response),
  piiLeakage: (_prompt: string, response: string) =>
    evaluatePIILeakage(response),
  relevance: evaluateRelevance,
  toxicity: (_prompt: string, response: string) => evaluateToxicity(response)
} as const;

type EvaluatorName = keyof typeof EVALUATOR_MAP;

export const runEvaluation =
  (db: Database) => async (c: AppContextWithJson<Body>) => {
    const orgId = c.get("orgId");
    const id = c.req.param("id") as string;
    const body = c.req.valid("json");
    const prompts = body.prompts ?? body.samples ?? [];
    const evaluators = body.evaluators;

    const [evaluation] = await db
      .select()
      .from(evaluations)
      .where(and(eq(evaluations.id, id), eq(evaluations.organizationId, orgId)))
      .limit(1);

    if (!evaluation) {
      throw new NotFoundError("Evaluation not found");
    }

    await db
      .update(evaluations)
      .set({ status: "running", updatedAt: new Date() })
      .where(eq(evaluations.id, id));

    const activeEvaluators: EvaluatorName[] = evaluators ?? [
      "relevance",
      "coherence",
      "piiLeakage",
      "toxicity"
    ];

    const results = [];
    let totalScore = 0;
    let resultCount = 0;

    for (const testCase of prompts) {
      for (const evaluatorName of activeEvaluators) {
        const evaluatorFn = EVALUATOR_MAP[evaluatorName];
        const result = evaluatorFn(testCase.prompt, testCase.response);

        const [record] = await db
          .insert(evaluationResults)
          .values({
            actualOutput: testCase.response,
            evaluationId: id,
            feedback: result.feedback,
            input: testCase.prompt,
            metrics: result.metrics,
            passed: result.passed ? "true" : "false",
            score: String(result.score)
          })
          .returning();

        results.push(record);
        totalScore += result.score;
        resultCount++;
      }
    }

    const avgScore = resultCount > 0 ? totalScore / resultCount : 0;

    await db
      .update(evaluations)
      .set({
        completedAt: new Date(),
        score: String(avgScore),
        status: "completed",
        updatedAt: new Date()
      })
      .where(eq(evaluations.id, id));

    void publishEvent(orgId, "evaluation.completed", {
      evaluationId: id,
      resultCount,
      totalScore: avgScore
    });

    return success(c, {
      evaluationId: id,
      resultCount,
      results,
      totalScore: avgScore
    });
  };
