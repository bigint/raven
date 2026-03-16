import type { Database } from "@raven/db";
import { plugins } from "@raven/db";
import type { z } from "zod";
import { publishEvent } from "@/lib/events";
import { created } from "@/lib/response";
import type { AppContextWithJson } from "@/lib/types";
import { logAudit } from "@/modules/audit-logs/index";
import type { createPluginSchema } from "./schema";

type Body = z.infer<typeof createPluginSchema>;

export const createPlugin =
  (db: Database) => async (c: AppContextWithJson<Body>) => {
    const orgId = c.get("orgId");
    const user = c.get("user");
    const { name, hook, config, isEnabled, description } = c.req.valid("json");

    const [record] = await db
      .insert(plugins)
      .values({
        config: config ?? {},
        description: description ?? "",
        hooks: [hook],
        isEnabled,
        name,
        organizationId: orgId
      })
      .returning();

    const safe = record as NonNullable<typeof record>;
    void publishEvent(orgId, "plugin.created", safe);
    void logAudit(db, {
      action: "plugin.created",
      actorId: user.id,
      metadata: { hook, name },
      orgId,
      resourceId: safe.id,
      resourceType: "plugin"
    });
    return created(c, safe);
  };
