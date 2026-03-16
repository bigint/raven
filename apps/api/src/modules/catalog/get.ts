import type { Database } from "@raven/db";
import { and, eq } from "drizzle-orm";
import { NotFoundError } from "@/lib/errors";
import { success } from "@/lib/response";
import type { AppContext } from "@/lib/types";
import { catalogItems } from "./table";

export const getCatalogItem = (db: Database) => async (c: AppContext) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id") as string;

  const [item] = await db
    .select()
    .from(catalogItems)
    .where(and(eq(catalogItems.id, id), eq(catalogItems.organizationId, orgId)))
    .limit(1);

  if (!item) {
    throw new NotFoundError("Catalog item not found");
  }

  return success(c, item);
};
