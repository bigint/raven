import type { Database } from "@raven/db";
import { virtualKeys } from "@raven/db";
import { and, eq } from "drizzle-orm";
import type { Context } from "hono";
import { NotFoundError } from "../../lib/errors";
import { safeKey } from "./helpers";

export const getKey = (db: Database) => async (c: Context) => {
  const orgId = c.get("orgId" as never) as string;
  const id = c.req.param("id") as string;

  const [key] = await db
    .select()
    .from(virtualKeys)
    .where(and(eq(virtualKeys.id, id), eq(virtualKeys.organizationId, orgId)))
    .limit(1);

  if (!key) {
    throw new NotFoundError("Virtual key not found");
  }

  return c.json(safeKey(key));
};
