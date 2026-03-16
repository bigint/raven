import type { Database } from "@raven/db";
import { and, eq } from "drizzle-orm";
import { NotFoundError } from "@/lib/errors";
import { success } from "@/lib/response";
import type { AppContext } from "@/lib/types";
import { agentIdentities } from "./table";

export const getAgent = (db: Database) => async (c: AppContext) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id") as string;

  const [agent] = await db
    .select()
    .from(agentIdentities)
    .where(
      and(eq(agentIdentities.id, id), eq(agentIdentities.organizationId, orgId))
    )
    .limit(1);

  if (!agent) {
    throw new NotFoundError("Agent identity not found");
  }

  return success(c, agent);
};
