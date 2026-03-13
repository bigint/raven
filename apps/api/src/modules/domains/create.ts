import { randomBytes } from "node:crypto";
import type { Env } from "@raven/config";
import type { Database } from "@raven/db";
import { customDomains } from "@raven/db";
import { count, eq } from "drizzle-orm";
import type { z } from "zod";
import { ConflictError } from "@/lib/errors";
import { created } from "@/lib/response";
import type { AppContextWithJson } from "@/lib/types";
import {
  checkFeatureGate,
  checkResourceLimit
} from "@/modules/proxy/plan-gate";
import type { addDomainSchema } from "./schema";

type Body = z.infer<typeof addDomainSchema>;

export const createDomain =
  (db: Database, _env: Env) => async (c: AppContextWithJson<Body>) => {
    const orgId = c.get("orgId");
    const { domain } = c.req.valid("json");

    await checkFeatureGate(db, orgId, "hasCustomDomains");

    const [existing] = await db
      .select({ value: count() })
      .from(customDomains)
      .where(eq(customDomains.organizationId, orgId));
    await checkResourceLimit(
      db,
      orgId,
      "maxCustomDomains",
      existing?.value ?? 0
    );

    // Check domain uniqueness across all orgs
    const [duplicate] = await db
      .select({ id: customDomains.id })
      .from(customDomains)
      .where(eq(customDomains.domain, domain))
      .limit(1);
    if (duplicate) {
      throw new ConflictError("This domain is already in use");
    }

    const verificationToken = randomBytes(16).toString("hex");

    const [record] = await db
      .insert(customDomains)
      .values({
        domain,
        organizationId: orgId,
        verificationToken
      })
      .returning();

    return created(c, record);
  };
