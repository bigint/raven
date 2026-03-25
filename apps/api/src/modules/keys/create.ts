import type { Database } from "@raven/db";
import { virtualKeys } from "@raven/db";
import type { z } from "zod";
import { auditAndPublish } from "@/lib/audit";
import { created } from "@/lib/response";
import type { AuthContextWithJson } from "@/lib/types";
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
    void auditAndPublish(db, user, "key", "created", {
      data: { ...safe, key: undefined },
      metadata: { environment, name },
      resourceId: safe.id
    });
    return created(c, { ...safe, key });
  };
