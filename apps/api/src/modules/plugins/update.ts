import type { Database } from "@raven/db";
import { plugins } from "@raven/db";
import { and, eq } from "drizzle-orm";
import type { z } from "zod";
import { NotFoundError } from "@/lib/errors";
import { publishEvent } from "@/lib/events";
import { success } from "@/lib/response";
import type { AppContextWithJson } from "@/lib/types";
import { logAudit } from "@/modules/audit-logs/index";
import type { updatePluginSchema } from "./schema";

type Body = z.infer<typeof updatePluginSchema>;

export const updatePlugin =
  (db: Database) => async (c: AppContextWithJson<Body>) => {
    const orgId = c.get("orgId");
    const user = c.get("user");
    const id = c.req.param("id") as string;
    const { name, hook, config, isEnabled, description } = c.req.valid("json");

    const [existing] = await db
      .select({ id: plugins.id })
      .from(plugins)
      .where(and(eq(plugins.id, id), eq(plugins.organizationId, orgId)))
      .limit(1);

    if (!existing) {
      throw new NotFoundError("Plugin not found");
    }

    const updates: Partial<typeof plugins.$inferInsert> = {};

    if (name !== undefined) updates.name = name;
    if (hook !== undefined) updates.hooks = [hook];
    if (config !== undefined) updates.config = config;
    if (isEnabled !== undefined) updates.isEnabled = isEnabled;
    if (description !== undefined) updates.description = description;

    updates.updatedAt = new Date();

    const [updated] = await db
      .update(plugins)
      .set(updates)
      .where(and(eq(plugins.id, id), eq(plugins.organizationId, orgId)))
      .returning();

    void publishEvent(orgId, "plugin.updated", updated);
    void logAudit(db, {
      action: "plugin.updated",
      actorId: user.id,
      metadata: { config, hook, isEnabled, name },
      orgId,
      resourceId: id,
      resourceType: "plugin"
    });
    return success(c, updated);
  };
