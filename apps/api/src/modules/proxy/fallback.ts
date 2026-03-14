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

  for (const config of fallbackConfigs) {
    try {
      const adapter = getProviderAdapter(config.provider);

      let decryptedApiKey: string;
      try {
        decryptedApiKey = decrypt(config.apiKey, env.ENCRYPTION_SECRET);
      } catch {
        console.error(
          `Failed to decrypt fallback provider credentials: ${config.provider}`
        );
        continue;
      }

      const result = await requestFn({ adapter, decryptedApiKey });

      if (result.response.ok) {
        console.info(
          `Fallback succeeded with provider: ${config.provider} (${config.id})`
        );
        return {
          providerConfigId: config.id,
          providerName: config.provider,
          result
        };
      }
    } catch (err) {
      console.error(
        `Fallback provider ${config.provider} failed:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  return null;
};
