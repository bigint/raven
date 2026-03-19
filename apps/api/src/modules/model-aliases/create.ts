import type { Database } from "@raven/db";
import { modelAliases } from "@raven/db";
import type { z } from "zod";
import { ConflictError } from "@/lib/errors";
import { publishEvent } from "@/lib/events";
import { created } from "@/lib/response";
import type { AppContextWithJson } from "@/lib/types";
import { logAudit } from "@/modules/audit-logs/index";
import { checkFeatureGate } from "@/modules/proxy/plan-gate";
import type { createModelAliasSchema } from "./schema";

type Body = z.infer<typeof createModelAliasSchema>;

export const createModelAlias =
  (db: Database) => async (c: AppContextWithJson<Body>) => {
    const orgId = c.get("orgId");
    const user = c.get("user");
    await checkFeatureGate(db, orgId, "hasModelAliases");
    const { alias, targetModel } = c.req.valid("json");

    try {
      const [record] = await db
        .insert(modelAliases)
        .values({
          alias,
          organizationId: orgId,
          targetModel
        })
        .returning();

      void publishEvent(orgId, "model-alias.created", record);
      void logAudit(db, {
        action: "model-alias.created",
        actorId: user.id,
        metadata: { alias, targetModel },
        orgId,
        resourceId: (record as NonNullable<typeof record>).id,
        resourceType: "model-alias"
      });

      return created(c, record);
    } catch (err: unknown) {
      const isUniqueViolation =
        err instanceof Error && err.message.includes("unique");
      if (isUniqueViolation) {
        throw new ConflictError(
          `Alias "${alias}" already exists for this organization`
        );
      }
      throw err;
    }
  };
