import type { Database } from "@raven/db";
import { virtualKeys } from "@raven/db";
import type { z } from "zod";
import { publishEvent } from "@/lib/events";
import { created } from "@/lib/response";
import type { AuthContextWithJson } from "@/lib/types";
import { logAudit } from "@/modules/audit-logs/index";
import { generateKey, safeKey } from "./helpers";
import type { createKeySchema } from "./schema";

type Body = z.infer<typeof createKeySchema>;

export const createKey =
  (db: Database) => async (c: AuthContextWithJson<Body>) => {
    const user = c.get("user");
    const { name, environment, rateLimitRpm, rateLimitRpd, expiresAt } =
      c.req.valid("json");

    const { key, hash, prefix } = generateKey(environment);

    const [record] = await db
      .insert(virtualKeys)
      .values({
        environment,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        keyHash: hash,
        keyPrefix: prefix,
        name,
        rateLimitRpd,
        rateLimitRpm
      })
      .returning();

    // Return full plaintext key ONLY on creation
    const safe = safeKey(record as NonNullable<typeof record>);
    void publishEvent("key.created", {
      ...safe,
      key: undefined
    });
    void logAudit(db, {
      action: "key.created",
      actorId: user.id,
      metadata: { environment, name },
      resourceId: safe.id,
      resourceType: "key"
    });
    return created(c, { ...safe, key });
  };
