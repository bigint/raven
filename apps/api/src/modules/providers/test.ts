import type { Env } from "@raven/config";
import type { Database } from "@raven/db";
import { providerConfigs } from "@raven/db";
import { eq } from "drizzle-orm";
import { decrypt } from "@/lib/crypto";
import { NotFoundError, UnauthorizedError } from "@/lib/errors";
import type { AuthContext } from "@/lib/types";
import { validateApiKey } from "./helpers";

export const testProvider =
  (db: Database, env: Env) => async (c: AuthContext) => {
    const id = c.req.param("id") as string;

    const [provider] = await db
      .select()
      .from(providerConfigs)
      .where(eq(providerConfigs.id, id))
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
