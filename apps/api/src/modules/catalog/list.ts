import type { Database } from "@raven/db";
import { and, eq, ilike, type SQL } from "drizzle-orm";
import type { z } from "zod";
import { success } from "@/lib/response";
import type { AppContextWithQuery } from "@/lib/types";
import type { listCatalogQuerySchema } from "./schema";
import { catalogItems } from "./table";

type Query = z.infer<typeof listCatalogQuerySchema>;

export const listCatalogItems =
  (db: Database) => async (c: AppContextWithQuery<Query>) => {
    const orgId = c.get("orgId");
    const { type, status, search } = c.req.valid("query");

    const conditions: SQL[] = [eq(catalogItems.organizationId, orgId)];

    if (type) {
      conditions.push(eq(catalogItems.type, type));
    }

    if (status) {
      conditions.push(eq(catalogItems.status, status));
    }

    if (search) {
      conditions.push(ilike(catalogItems.name, `%${search}%`));
    }

    const rows = await db
      .select()
      .from(catalogItems)
      .where(and(...conditions));

    return success(c, rows);
  };
