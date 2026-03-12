import type { Env } from "@raven/config";
import type { Database } from "@raven/db";
import { providerConfigs } from "@raven/db";
import { and, eq } from "drizzle-orm";
import type { Redis } from "ioredis";
import { decrypt } from "@/lib/crypto";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { getProviderAdapter, type ProviderAdapter } from "./providers/registry";
import { type RoutingStrategy, resolveWithStrategy } from "./router";

export interface ProviderResolution {
  adapter: ProviderAdapter;
  decryptedApiKey: string;
  providerConfigId: string;
  providerName: string;
  upstreamPath: string;
}

export const resolveProvider = async (
  db: Database,
  env: Env,
  organizationId: string,
  reqPath: string,
  redis?: Redis,
  strategy?: RoutingStrategy
): Promise<ProviderResolution> => {
  const pathSegments = reqPath.replace(/^\/v1\/proxy\/?/, "").split("/");
  const providerSegment = pathSegments[0];

  if (!providerSegment) {
    throw new ValidationError("Provider not specified in path");
  }

  // Parse "openai~configId" or just "openai"
  const tildeIdx = providerSegment.indexOf("~");
  const providerName =
    tildeIdx === -1 ? providerSegment : providerSegment.slice(0, tildeIdx);
  const configId = tildeIdx === -1 ? null : providerSegment.slice(tildeIdx + 1);

  if (!providerName) {
    throw new ValidationError("Provider not specified in path");
  }

  let providerConfig: typeof providerConfigs.$inferSelect | undefined;

  if (configId) {
    const [result] = await db
      .select()
      .from(providerConfigs)
      .where(
        and(
          eq(providerConfigs.id, configId),
          eq(providerConfigs.organizationId, organizationId),
          eq(providerConfigs.provider, providerName)
        )
      )
      .limit(1);
    providerConfig = result;

    if (!providerConfig) {
      throw new NotFoundError(
        `No provider config found for '${providerName}' with ID '${configId}'`
      );
    }
  } else if (redis) {
    // Use smart routing when Redis is available
    const resolvedId = await resolveWithStrategy(
      db,
      redis,
      organizationId,
      providerName,
      strategy
    );
    const [result] = await db
      .select()
      .from(providerConfigs)
      .where(eq(providerConfigs.id, resolvedId))
      .limit(1);
    providerConfig = result;

    if (!providerConfig) {
      throw new NotFoundError(`No provider config found for '${providerName}'`);
    }
  } else {
    // Fallback: pick a random enabled config
    const allConfigs = await db
      .select()
      .from(providerConfigs)
      .where(
        and(
          eq(providerConfigs.organizationId, organizationId),
          eq(providerConfigs.provider, providerName),
          eq(providerConfigs.isEnabled, true)
        )
      );

    if (allConfigs.length === 0) {
      throw new NotFoundError(`No provider config found for '${providerName}'`);
    }

    providerConfig = allConfigs[Math.floor(Math.random() * allConfigs.length)];
  }

  if (!providerConfig.isEnabled) {
    throw new ForbiddenError(`Provider '${providerName}' is disabled`);
  }

  const adapter = getProviderAdapter(providerName);

  let decryptedApiKey: string;
  try {
    decryptedApiKey = decrypt(providerConfig.apiKey, env.ENCRYPTION_SECRET);
  } catch {
    throw new Error("Failed to decrypt provider credentials");
  }

  const upstreamPath = `/${pathSegments.slice(1).join("/")}`;

  return {
    adapter,
    decryptedApiKey,
    providerConfigId: providerConfig.id,
    providerName,
    upstreamPath
  };
};
