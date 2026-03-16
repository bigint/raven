import type { Database } from "@raven/db";
import { conversations } from "@raven/db";
import { desc, eq } from "drizzle-orm";
import { success } from "@/lib/response";
import type { AppContext } from "@/lib/types";

export const listConversations = (db: Database) => async (c: AppContext) => {
  const orgId = c.get("orgId");

  const rows = await db
    .select()
    .from(conversations)
    .where(eq(conversations.organizationId, orgId))
    .orderBy(desc(conversations.updatedAt));

  return success(c, rows);
};
