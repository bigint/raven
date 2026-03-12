import type { Database } from "@raven/db";
import { virtualKeys } from "@raven/db";
import { count, eq } from "drizzle-orm";
import type { Context } from "hono";
import { ValidationError } from "@/lib/errors";
import { publishEvent } from "@/lib/events";
import { created } from "@/lib/response";
import { checkResourceLimit } from "@/modules/proxy/plan-gate";
import { generateKey, safeKey } from "./helpers";
import { createKeySchema } from "./schema";

export const createKey = (db: Database) => async (c: Context) => {
  const orgId = c.get("orgId" as never) as string;
  const body = await c.req.json();
  const result = createKeySchema.safeParse(body);

  if (!result.success) {
    throw new ValidationError("Invalid request body", {
      errors: result.error.flatten().fieldErrors
    });
  }

  const { name, environment, rateLimitRpm, rateLimitRpd, expiresAt } =
    result.data;

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
  return created(c, { ...safe, key });
};
