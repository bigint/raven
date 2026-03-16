import type { Database } from "@raven/db";
import { and, eq } from "drizzle-orm";
import type { z } from "zod";
import { NotFoundError } from "@/lib/errors";
import { publishEvent } from "@/lib/events";
import { success } from "@/lib/response";
import type { AppContextWithJson } from "@/lib/types";
import { logAudit } from "@/modules/audit-logs/index";
import type { updateCatalogItemSchema } from "./schema";
import { catalogItems } from "./table";

type Body = z.infer<typeof updateCatalogItemSchema>;

export const updateCatalogItem =
  (db: Database) => async (c: AppContextWithJson<Body>) => {
    const orgId = c.get("orgId");
    const user = c.get("user");
    const id = c.req.param("id") as string;
    const {
      name,
      description,
      status,
      version,
      tags,
      config,
      metadata,
      rejectionReason
    } = c.req.valid("json");

    const [existing] = await db
      .select({ id: catalogItems.id })
      .from(catalogItems)
      .where(
        and(eq(catalogItems.id, id), eq(catalogItems.organizationId, orgId))
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError("Catalog item not found");
    }

    const updates: Partial<typeof catalogItems.$inferInsert> = {};

    if (name !== undefined) {
      updates.name = name;
    }

    if (description !== undefined) {
      updates.description = description;
    }

    if (version !== undefined) {
      updates.version = version;
    }

    if (tags !== undefined) {
      updates.tags = tags;
    }

    if (config !== undefined) {
      updates.config = config;
    }

    if (metadata !== undefined) {
      updates.metadata = metadata;
    }

    if (rejectionReason !== undefined) {
      updates.rejectionReason = rejectionReason;
    }

    // Handle approval workflow status transitions
    if (status !== undefined) {
      updates.status = status;
      if (status === "approved" || status === "rejected") {
        updates.reviewedBy = user.id;
        updates.reviewedAt = new Date();
      }
    }

    const [updated] = await db
      .update(catalogItems)
      .set(updates)
      .where(
        and(eq(catalogItems.id, id), eq(catalogItems.organizationId, orgId))
      )
      .returning();

    void publishEvent(orgId, "catalog_item.updated", updated);
    void logAudit(db, {
      action: "catalog_item.updated",
      actorId: user.id,
      metadata: { name, rejectionReason, status },
      orgId,
      resourceId: id,
      resourceType: "catalog_item"
    });
    return success(c, updated);
  };
