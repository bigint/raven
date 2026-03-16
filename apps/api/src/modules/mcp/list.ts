import type { Database } from "@raven/db";
import { eq } from "drizzle-orm";
import { success } from "@/lib/response";
import type { AppContext } from "@/lib/types";
import { mcpServers } from "./table";

export const listMcpServers = (db: Database) => async (c: AppContext) => {
  const orgId = c.get("orgId");

  const rows = await db
    .select()
    .from(mcpServers)
    .where(eq(mcpServers.organizationId, orgId));

  return success(c, rows);
};
