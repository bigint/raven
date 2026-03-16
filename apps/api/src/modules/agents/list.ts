import type { Database } from "@raven/db";
import { eq } from "drizzle-orm";
import { success } from "@/lib/response";
import type { AppContext } from "@/lib/types";
import { agentIdentities } from "./table";

export const listAgents = (db: Database) => async (c: AppContext) => {
  const orgId = c.get("orgId");

  const rows = await db
    .select()
    .from(agentIdentities)
    .where(eq(agentIdentities.organizationId, orgId));

  return success(c, rows);
};
