import type { Database } from "@raven/db";
import { policies, policyRules } from "@raven/db";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import type { z } from "zod";
import { NotFoundError } from "@/lib/errors";
import { success } from "@/lib/response";
import type { AppContext, AppContextWithJson } from "@/lib/types";
import { jsonValidator } from "@/lib/validation";
import { createPolicy } from "./create";
import { deletePolicy } from "./delete";
import { evaluateCondition } from "./evaluate-condition";
import { listPolicies } from "./list";
import {
  createPolicySchema,
  testPolicySchema,
  updatePolicySchema
} from "./schema";
import { updatePolicy } from "./update";

type TestBody = z.infer<typeof testPolicySchema>;

const getPolicy = (db: Database) => async (c: AppContext) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id") as string;

  const [policy] = await db
    .select()
    .from(policies)
    .where(and(eq(policies.id, id), eq(policies.organizationId, orgId)))
    .limit(1);

  if (!policy) {
    throw new NotFoundError("Policy not found");
  }

  const rules = await db
    .select()
    .from(policyRules)
    .where(eq(policyRules.policyId, id));

  return success(c, { ...policy, rules });
};

const testPolicy =
  (db: Database) => async (c: AppContextWithJson<TestBody>) => {
    const orgId = c.get("orgId");
    const id = c.req.param("id") as string;
    const { requestBody, model, provider, estimatedCost } = c.req.valid("json");

    const [policy] = await db
      .select()
      .from(policies)
      .where(and(eq(policies.id, id), eq(policies.organizationId, orgId)))
      .limit(1);

    if (!policy) {
      throw new NotFoundError("Policy not found");
    }

    const rules = await db
      .select()
      .from(policyRules)
      .where(eq(policyRules.policyId, id));

    const messages = requestBody.messages;
    const contents = Array.isArray(messages)
      ? messages
          .map((m: Record<string, unknown>) =>
            typeof m.content === "string" ? m.content : ""
          )
          .filter(Boolean)
      : [];

    const context = {
      estimatedCost,
      model,
      organizationId: orgId,
      provider,
      requestBody,
      requestId: "test"
    };

    const evaluations = rules.map((rule) => {
      const result = evaluateCondition(rule.conditions, context, contents);
      return {
        enforcement: rule.enforcement,
        evidence: result.evidence,
        matched: result.matched,
        ruleId: rule.id,
        ruleName: rule.name
      };
    });

    const blocked = evaluations.some(
      (e) => e.matched && e.enforcement === "block"
    );
    const warnings = evaluations
      .filter((e) => e.matched && e.enforcement === "warn")
      .map((e) => `Rule "${e.ruleName}": condition matched`);

    return success(c, {
      allowed: !blocked,
      blocked,
      evaluations,
      warnings
    });
  };

export const createPoliciesModule = (db: Database) => {
  const app = new Hono();

  app.get("/", listPolicies(db));
  app.post("/", jsonValidator(createPolicySchema), createPolicy(db));
  app.get("/:id", getPolicy(db));
  app.put("/:id", jsonValidator(updatePolicySchema), updatePolicy(db));
  app.delete("/:id", deletePolicy(db));
  app.post("/:id/test", jsonValidator(testPolicySchema), testPolicy(db));

  return app;
};
