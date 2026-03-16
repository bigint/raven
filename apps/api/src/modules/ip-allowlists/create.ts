import type { Database } from "@raven/db";
import { ipAllowlists } from "@raven/db";
import type { z } from "zod";
import { publishEvent } from "@/lib/events";
import { created } from "@/lib/response";
import type { AppContextWithJson } from "@/lib/types";
import { logAudit } from "@/modules/audit-logs/index";
import type { createIpRuleSchema } from "./schema";

type Body = z.infer<typeof createIpRuleSchema>;

export const createIpRule =
  (db: Database) => async (c: AppContextWithJson<Body>) => {
    const orgId = c.get("orgId");
    const user = c.get("user");
    const { cidr, description, isEnabled } = c.req.valid("json");

    const [record] = await db
      .insert(ipAllowlists)
      .values({
        cidr,
        description,
        isEnabled,
        organizationId: orgId
      })
      .returning();

    const safe = record as NonNullable<typeof record>;
    void publishEvent(orgId, "ip-allowlist.created", safe);
    void logAudit(db, {
      action: "ip-allowlist.created",
      actorId: user.id,
      metadata: { cidr, description },
      orgId,
      resourceId: safe.id,
      resourceType: "ip-allowlist"
    });
    return created(c, safe);
  };
