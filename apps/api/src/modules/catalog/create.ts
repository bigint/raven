import type { Database } from "@raven/db";
import type { z } from "zod";
import { publishEvent } from "@/lib/events";
import { created } from "@/lib/response";
import type { AppContextWithJson } from "@/lib/types";
import { logAudit } from "@/modules/audit-logs/index";
import type { createCatalogItemSchema } from "./schema";
import { catalogItems } from "./table";

type Body = z.infer<typeof createCatalogItemSchema>;

export const createCatalogItem =
  (db: Database) => async (c: AppContextWithJson<Body>) => {
    const orgId = c.get("orgId");
    const user = c.get("user");
    const { name, description, type, version, tags, config, metadata } =
      c.req.valid("json");

    const [record] = await db
      .insert(catalogItems)
      .values({
        config: config ?? {},
        description: description ?? "",
        metadata: metadata ?? {},
        name,
        organizationId: orgId,
        status: "pending",
        submittedBy: user.id,
        tags: tags ?? [],
        type,
        version: version ?? "1.0.0"
      })
      .returning();

    const safe = record as NonNullable<typeof record>;
    void publishEvent(orgId, "catalog_item.created", safe);
    void logAudit(db, {
      action: "catalog_item.created",
      actorId: user.id,
      metadata: { name, type },
      orgId,
      resourceId: safe.id,
      resourceType: "catalog_item"
    });
    return created(c, safe);
  };
