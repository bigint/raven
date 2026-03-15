import type { Env } from "@raven/config";
import type { Database } from "@raven/db";
import { providerConfigs } from "@raven/db";
import { and, eq, ne } from "drizzle-orm";
import { decrypt } from "@/lib/crypto";
import { getProviderAdapter } from "./providers/registry";
import type { ForwardRequestInput, ForwardRequestResult } from "./upstream";

export interface FallbackResult {
  result: ForwardRequestResult;
  providerConfigId: string;
  providerName: string;
}

export const withFallback = async (
  db: Database,
  env: Env,
  orgId: string,
  primaryConfigId: string,
  requestFn: (
    input: Partial<ForwardRequestInput>
  ) => Promise<ForwardRequestResult>
): Promise<FallbackResult | null> => {
  const fallbackConfigs = await db
    .select()
    .from(providerConfigs)
    .where(
      and(
        eq(providerConfigs.organizationId, orgId),
        eq(providerConfigs.isEnabled, true),
        ne(providerConfigs.id, primaryConfigId)
      )
    )
    .limit(10);

  // Decrypt all keys in parallel upfront
  const prepared = await Promise.all(
    fallbackConfigs.map(async (config) => {
      try {
        const adapter = getProviderAdapter(config.provider);
        const decryptedApiKey = decrypt(config.apiKey, env.ENCRYPTION_SECRET);
        return { adapter, config, decryptedApiKey };
      } catch {
        console.error(
          `Failed to decrypt fallback provider credentials: ${config.provider}`
        );
        return null;
      }
    })
  );

  for (const entry of prepared) {
    if (!entry) continue;

    try {
      const result = await requestFn({
        adapter: entry.adapter,
        decryptedApiKey: entry.decryptedApiKey
      });

      if (result.response.ok) {
        console.info(
          `Fallback succeeded with provider: ${entry.config.provider} (${entry.config.id})`
        );
        return {
          providerConfigId: entry.config.id,
          providerName: entry.config.provider,
          result
        };
      }
    } catch (err) {
      console.error(
        `Fallback provider ${entry.config.provider} failed:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  return null;
};
