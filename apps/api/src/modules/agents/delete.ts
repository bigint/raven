import type { Database } from "@raven/db";
import { and, eq } from "drizzle-orm";
import { NotFoundError } from "@/lib/errors";
import { publishEvent } from "@/lib/events";
import { success } from "@/lib/response";
import type { AppContext } from "@/lib/types";
import { logAudit } from "@/modules/audit-logs/index";
import { agentIdentities } from "./table";

export const deleteAgent = (db: Database) => async (c: AppContext) => {
  const orgId = c.get("orgId");
  const user = c.get("user");
  const id = c.req.param("id") as string;

  const [existing] = await db
    .select({ id: agentIdentities.id })
    .from(agentIdentities)
    .where(
      and(eq(agentIdentities.id, id), eq(agentIdentities.organizationId, orgId))
    )
    .limit(1);

  if (!existing) {
    throw new NotFoundError("Agent identity not found");
  }

  await db
    .delete(agentIdentities)
    .where(
      and(eq(agentIdentities.id, id), eq(agentIdentities.organizationId, orgId))
    );

  void publishEvent(orgId, "agent.deleted", { id });
  void logAudit(db, {
    action: "agent.deleted",
    actorId: user.id,
    orgId,
    resourceId: id,
    resourceType: "agent"
  });
  return success(c, { success: true });
};
