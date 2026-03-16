import type { Database } from "@raven/db";
import { and, eq } from "drizzle-orm";
import type { z } from "zod";
import { NotFoundError } from "@/lib/errors";
import { publishEvent } from "@/lib/events";
import { success } from "@/lib/response";
import type { AppContextWithJson } from "@/lib/types";
import { logAudit } from "@/modules/audit-logs/index";
import type { updateAgentSchema } from "./schema";
import { agentIdentities } from "./table";

type Body = z.infer<typeof updateAgentSchema>;

export const updateAgent =
  (db: Database) => async (c: AppContextWithJson<Body>) => {
    const orgId = c.get("orgId");
    const user = c.get("user");
    const id = c.req.param("id") as string;
    const {
      name,
      description,
      status,
      virtualKeyId,
      capabilities,
      budgetMax,
      budgetPeriod,
      maxDelegationDepth,
      canDelegate,
      metadata
    } = c.req.valid("json");

    const [existing] = await db
      .select({ id: agentIdentities.id })
      .from(agentIdentities)
      .where(
        and(
          eq(agentIdentities.id, id),
          eq(agentIdentities.organizationId, orgId)
        )
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError("Agent identity not found");
    }

    const updates: Partial<typeof agentIdentities.$inferInsert> = {};

    if (name !== undefined) {
      updates.name = name;
    }

    if (description !== undefined) {
      updates.description = description;
    }

    if (status !== undefined) {
      updates.status = status;
    }

    if (virtualKeyId !== undefined) {
      updates.virtualKeyId = virtualKeyId;
    }

    if (capabilities !== undefined) {
      updates.capabilities = capabilities;
    }

    if (budgetMax !== undefined) {
      updates.budgetMax = budgetMax;
    }

    if (budgetPeriod !== undefined) {
      updates.budgetPeriod = budgetPeriod;
    }

    if (maxDelegationDepth !== undefined) {
      updates.maxDelegationDepth = maxDelegationDepth;
    }

    if (canDelegate !== undefined) {
      updates.canDelegate = canDelegate;
    }

    if (metadata !== undefined) {
      updates.metadata = metadata;
    }

    const [updated] = await db
      .update(agentIdentities)
      .set(updates)
      .where(
        and(
          eq(agentIdentities.id, id),
          eq(agentIdentities.organizationId, orgId)
        )
      )
      .returning();

    void publishEvent(orgId, "agent.updated", updated);
    void logAudit(db, {
      action: "agent.updated",
      actorId: user.id,
      metadata: { budgetMax, canDelegate, name, status },
      orgId,
      resourceId: id,
      resourceType: "agent"
    });
    return success(c, updated);
  };
