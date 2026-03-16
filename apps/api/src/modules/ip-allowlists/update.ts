import type { Database } from "@raven/db";
import { ipAllowlists } from "@raven/db";
import { and, eq } from "drizzle-orm";
import type { z } from "zod";
import { NotFoundError } from "@/lib/errors";
import { publishEvent } from "@/lib/events";
import { success } from "@/lib/response";
import type { AppContextWithJson } from "@/lib/types";
import { logAudit } from "@/modules/audit-logs/index";
import type { updateIpRuleSchema } from "./schema";

type Body = z.infer<typeof updateIpRuleSchema>;

export const updateIpRule =
  (db: Database) => async (c: AppContextWithJson<Body>) => {
    const orgId = c.get("orgId");
    const user = c.get("user");
    const id = c.req.param("id") as string;
    const { cidr, description, isEnabled } = c.req.valid("json");

    const [existing] = await db
      .select({ id: ipAllowlists.id })
      .from(ipAllowlists)
      .where(
        and(eq(ipAllowlists.id, id), eq(ipAllowlists.organizationId, orgId))
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError("IP allowlist rule not found");
    }

    const updates: Partial<typeof ipAllowlists.$inferInsert> = {};

    if (cidr !== undefined) {
      updates.cidr = cidr;
    }

    if (description !== undefined) {
      updates.description = description;
    }

    if (isEnabled !== undefined) {
      updates.isEnabled = isEnabled;
    }

    updates.updatedAt = new Date();

    const [updated] = await db
      .update(ipAllowlists)
      .set(updates)
      .where(
        and(eq(ipAllowlists.id, id), eq(ipAllowlists.organizationId, orgId))
      )
      .returning();

    const record = updated as NonNullable<typeof updated>;
    void publishEvent(orgId, "ip-allowlist.updated", record);
    void logAudit(db, {
      action: "ip-allowlist.updated",
      actorId: user.id,
      metadata: { cidr, description, isEnabled },
      orgId,
      resourceId: record.id,
      resourceType: "ip-allowlist"
    });
    return success(c, record);
  };
