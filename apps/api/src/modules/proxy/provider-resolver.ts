import type { Env } from "@raven/config";
import type { Database } from "@raven/db";
import { providerConfigs } from "@raven/db";
import { and, eq } from "drizzle-orm";
import type { Redis } from "ioredis";
import { cachedQuery } from "@/lib/cache-utils";
import { decrypt } from "@/lib/crypto";
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError
} from "@/lib/errors";
import { type RoutingStrategy, resolveWithStrategy } from "./router";

export interface ProviderResolution {
  decryptedApiKey: string;
  providerConfigId: string;
  providerName: string;
  upstreamPath: string;
}

export const parseProviderFromPath = (
  reqPath: string
): { providerName: string; configId: string | null; upstreamPath: string } => {
  const pathSegments = reqPath.replace(/^\/v1\/proxy\/?/, "").split("/");
  const providerSegment = pathSegments[0] ?? "";
  const tildeIdx = providerSegment.indexOf("~");
  return {
    configId: tildeIdx === -1 ? null : providerSegment.slice(tildeIdx + 1),
    providerName:
      tildeIdx === -1 ? providerSegment : providerSegment.slice(0, tildeIdx),
    upstreamPath: `/${pathSegments.slice(1).join("/")}`
  };
};

export const resolveProvider = async (
  db: Database,
  env: Env,
  organizationId: string,
  reqPath: string,
  redis?: Redis,
  strategy?: RoutingStrategy
): Promise<ProviderResolution> => {
  const { providerName, configId, upstreamPath } =
    parseProviderFromPath(reqPath);

  if (!providerName) {
    throw new ValidationError("Provider not specified in path");
  }

  let providerConfig: typeof providerConfigs.$inferSelect | null = null;

  if (configId) {
    const queryFn = async () => {
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
      return result ?? null;
    };
    providerConfig = redis
      ? await cachedQuery(redis, `pc:id:${configId}`, 60, queryFn)
      : await queryFn();
  } else if (redis) {
    const resolvedId = await resolveWithStrategy(
      db,
      redis,
      organizationId,
      providerName,
      strategy
    );
    providerConfig = await cachedQuery(
      redis,
      `pc:id:${resolvedId}`,
      60,
      async () => {
        const [result] = await db
          .select()
          .from(providerConfigs)
          .where(eq(providerConfigs.id, resolvedId))
          .limit(1);
        return result ?? null;
      }
    );
  } else {
    const allConfigs = await db
      .select()
      .from(providerConfigs)
      .where(
        and(
          eq(providerConfigs.organizationId, organizationId),
          eq(providerConfigs.provider, providerName),
          eq(providerConfigs.isEnabled, true)
        )
      )
      .limit(10);

    providerConfig =
      allConfigs[Math.floor(Math.random() * allConfigs.length)] ?? null;
  }

  if (!providerConfig) {
    throw new NotFoundError(
      configId
        ? `No provider config found for '${providerName}' with ID '${configId}'`
        : `No provider config found for '${providerName}'`
    );
  }

  if (!providerConfig.isEnabled) {
    throw new ForbiddenError(`Provider '${providerName}' is disabled`);
  }

  let decryptedApiKey: string;
  try {
    decryptedApiKey = decrypt(providerConfig.apiKey, env.ENCRYPTION_SECRET);
  } catch {
    throw new UnauthorizedError("Failed to decrypt provider credentials");
  }

  return {
    decryptedApiKey,
    providerConfigId: providerConfig.id,
    providerName,
    upstreamPath
  };
};
