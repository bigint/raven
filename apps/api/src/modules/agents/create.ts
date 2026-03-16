import type { Database } from "@raven/db";
import type { z } from "zod";
import { publishEvent } from "@/lib/events";
import { created } from "@/lib/response";
import type { AppContextWithJson } from "@/lib/types";
import { logAudit } from "@/modules/audit-logs/index";
import type { createAgentSchema } from "./schema";
import { agentIdentities } from "./table";

type Body = z.infer<typeof createAgentSchema>;

export const createAgent =
  (db: Database) => async (c: AppContextWithJson<Body>) => {
    const orgId = c.get("orgId");
    const user = c.get("user");
    const {
      name,
      description,
      type,
      virtualKeyId,
      parentAgentId,
      capabilities,
      budgetMax,
      budgetPeriod,
      maxDelegationDepth,
      canDelegate,
      metadata
    } = c.req.valid("json");

    const [record] = await db
      .insert(agentIdentities)
      .values({
        budgetMax: budgetMax ?? null,
        budgetPeriod,
        canDelegate,
        capabilities: capabilities ?? {},
        createdBy: user.id,
        description: description ?? "",
        maxDelegationDepth,
        metadata: metadata ?? {},
        name,
        organizationId: orgId,
        parentAgentId: parentAgentId ?? null,
        type,
        virtualKeyId: virtualKeyId ?? null
      })
      .returning();

    const safe = record as NonNullable<typeof record>;
    void publishEvent(orgId, "agent.created", safe);
    void logAudit(db, {
      action: "agent.created",
      actorId: user.id,
      metadata: { name, type },
      orgId,
      resourceId: safe.id,
      resourceType: "agent"
    });
    return created(c, safe);
  };
