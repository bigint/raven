import type { Database } from "@raven/db";
import { and, eq } from "drizzle-orm";
import { NotFoundError } from "@/lib/errors";
import { publishEvent } from "@/lib/events";
import { success } from "@/lib/response";
import type { AppContext } from "@/lib/types";
import { logAudit } from "@/modules/audit-logs/index";
import { catalogItems } from "./table";

export const deleteCatalogItem = (db: Database) => async (c: AppContext) => {
  const orgId = c.get("orgId");
  const user = c.get("user");
  const id = c.req.param("id") as string;

  const [existing] = await db
    .select({ id: catalogItems.id })
    .from(catalogItems)
    .where(and(eq(catalogItems.id, id), eq(catalogItems.organizationId, orgId)))
    .limit(1);

  if (!existing) {
    throw new NotFoundError("Catalog item not found");
  }

  await db
    .delete(catalogItems)
    .where(
      and(eq(catalogItems.id, id), eq(catalogItems.organizationId, orgId))
    );

  void publishEvent(orgId, "catalog_item.deleted", { id });
  void logAudit(db, {
    action: "catalog_item.deleted",
    actorId: user.id,
    orgId,
    resourceId: id,
    resourceType: "catalog_item"
  });
  return success(c, { success: true });
};
