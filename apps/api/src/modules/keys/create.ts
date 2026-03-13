import type { Database } from "@raven/db";
import { virtualKeys } from "@raven/db";
import { count, eq } from "drizzle-orm";
import type { z } from "zod";
import { publishEvent } from "@/lib/events";
import { created } from "@/lib/response";
import type { AppContextWithJson } from "@/lib/types";
import { logAudit } from "@/modules/audit-logs/index";
import { checkResourceLimit } from "@/modules/proxy/plan-gate";
import { generateKey, safeKey } from "./helpers";
import type { createKeySchema } from "./schema";

type Body = z.infer<typeof createKeySchema>;

export const createKey =
  (db: Database) => async (c: AppContextWithJson<Body>) => {
    const orgId = c.get("orgId");
    const user = c.get("user");
    const { name, environment, rateLimitRpm, rateLimitRpd, expiresAt } =
      c.req.valid("json");

    const [existing] = await db
      .select({ value: count() })
      .from(virtualKeys)
      .where(eq(virtualKeys.organizationId, orgId));
    await checkResourceLimit(db, orgId, "maxVirtualKeys", existing?.value ?? 0);

    const { key, hash, prefix } = generateKey(environment);

    const [record] = await db
      .insert(virtualKeys)
      .values({
        environment,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        keyHash: hash,
        keyPrefix: prefix,
        name,
        organizationId: orgId,
        rateLimitRpd,
        rateLimitRpm
      })
      .returning();

    // Return full plaintext key ONLY on creation
    const safe = safeKey(record as NonNullable<typeof record>);
    void publishEvent(orgId, "key.created", {
      ...safe,
      key: undefined
    });
    void logAudit(db, {
      action: "key.created",
      actorId: user.id,
      metadata: { environment, name },
      orgId,
      resourceId: safe.id,
      resourceType: "key"
    });
    return created(c, { ...safe, key });
  };
