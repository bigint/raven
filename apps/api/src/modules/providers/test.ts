import type { Env } from "@raven/config";
import type { Database } from "@raven/db";
import { providerConfigs } from "@raven/db";
import { and, eq } from "drizzle-orm";
import { decrypt } from "@/lib/crypto";
import { NotFoundError, UnauthorizedError } from "@/lib/errors";
import type { AppContext } from "@/lib/types";
import { validateApiKey } from "./helpers";

export const testProvider =
  (db: Database, env: Env) => async (c: AppContext) => {
    const orgId = c.get("orgId");
    const id = c.req.param("id") as string;

    const [provider] = await db
      .select()
      .from(providerConfigs)
      .where(
        and(
          eq(providerConfigs.id, id),
          eq(providerConfigs.organizationId, orgId)
        )
      )
      .limit(1);

    if (!provider) {
      throw new NotFoundError("Provider not found");
    }

    let decryptedKey: string;
    try {
      decryptedKey = decrypt(provider.apiKey, env.ENCRYPTION_SECRET);
    } catch {
      throw new UnauthorizedError("Failed to decrypt provider credentials");
    }

    try {
      await validateApiKey(provider.provider, decryptedKey);
      return c.json({
        message: "Provider connectivity verified",
        success: true
      });
    } catch {
      return c.json(
        { message: "Provider connectivity check failed", success: false },
        422
      );
    }
  };
