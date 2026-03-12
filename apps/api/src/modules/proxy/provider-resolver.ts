import type { Env } from "@raven/config";
import type { Database } from "@raven/db";
import { providerConfigs } from "@raven/db";
import { and, eq } from "drizzle-orm";
import { decrypt } from "@/lib/crypto";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError
} from "@/lib/errors";
import { type ProviderAdapter, getProviderAdapter } from "./providers/registry";

export interface ProviderResolution {
  adapter: ProviderAdapter;
  decryptedApiKey: string;
  providerName: string;
  upstreamPath: string;
}

export const resolveProvider = async (
  db: Database,
  env: Env,
  organizationId: string,
  reqPath: string
): Promise<ProviderResolution> => {
  const pathSegments = reqPath.replace(/^\/v1\/proxy\/?/, "").split("/");
  const providerName = pathSegments[0];

  if (!providerName) {
    throw new ValidationError("Provider not specified in path");
  }

  const [providerConfig] = await db
    .select()
    .from(providerConfigs)
    .where(
      and(
        eq(providerConfigs.organizationId, organizationId),
        eq(providerConfigs.provider, providerName)
      )
    )
    .limit(1);

  if (!providerConfig) {
    throw new NotFoundError(
      `No provider config found for '${providerName}'`
    );
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

  return { adapter, decryptedApiKey, providerName, upstreamPath };
};
