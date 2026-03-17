import type { Env } from "@raven/config";
import type { Database } from "@raven/db";
import { providerConfigs } from "@raven/db";
import { and, eq, ne } from "drizzle-orm";
import { decrypt } from "@/lib/crypto";

export interface FallbackProvider {
  decryptedApiKey: string;
  providerConfigId: string;
  providerName: string;
}

/**
 * Returns fallback provider configs for the same provider type.
 *
 * Cross-provider fallback (e.g. Anthropic → OpenAI) is not supported because
 * the model ID would not resolve on a different provider. Only same-provider
 * fallback (different API keys or endpoints) is returned.
 */
export const getFallbackProviders = async (
  db: Database,
  env: Env,
  orgId: string,
  primaryConfigId: string,
  primaryProviderName: string
): Promise<FallbackProvider[]> => {
  const configs = await db
    .select()
    .from(providerConfigs)
    .where(
      and(
        eq(providerConfigs.organizationId, orgId),
        eq(providerConfigs.provider, primaryProviderName),
        eq(providerConfigs.isEnabled, true),
        ne(providerConfigs.id, primaryConfigId)
      )
    )
    .limit(10);

  const results: FallbackProvider[] = [];

  for (const config of configs) {
    try {
      const decryptedApiKey = decrypt(config.apiKey, env.ENCRYPTION_SECRET);
      results.push({
        decryptedApiKey,
        providerConfigId: config.id,
        providerName: config.provider
      });
    } catch {
      console.error(
        `Failed to decrypt fallback provider credentials: ${config.provider} (${config.id})`
      );
    }
  }

  return results;
};
