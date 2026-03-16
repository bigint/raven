import type { Env } from "@raven/config";
import type { Database } from "@raven/db";
import { providerConfigs } from "@raven/db";
import { and, eq } from "drizzle-orm";
import type { Context } from "hono";
import type { Redis } from "ioredis";
import { cachedQuery, cacheKeys } from "@/lib/cache-utils";
import { decrypt } from "@/lib/crypto";
import { NotFoundError, UnauthorizedError } from "@/lib/errors";
import { PROVIDERS } from "@/lib/providers";

interface UpstreamModel {
  id: string;
  display_name?: string;
  name?: string;
  object?: string;
  owned_by?: string;
}

interface ModelEntry {
  id: string;
  name: string;
  provider: string;
}

export const listProviderModels =
  (db: Database, env: Env, redis: Redis) => async (c: Context) => {
    const orgId = c.get("orgId" as never) as string;
    const configId = c.req.param("id") ?? "";

    const [config] = await db
      .select()
      .from(providerConfigs)
      .where(
        and(
          eq(providerConfigs.id, configId),
          eq(providerConfigs.organizationId, orgId)
        )
      )
      .limit(1);

    if (!config) {
      throw new NotFoundError("Provider config not found");
    }

    const providerDef = PROVIDERS[config.provider];
    if (!providerDef) {
      throw new NotFoundError(`Unknown provider: ${config.provider}`);
    }

    const models = await cachedQuery<ModelEntry[]>(
      redis,
      cacheKeys.providerModels(configId),
      3600,
      async () => {
        let decryptedKey: string;
        try {
          decryptedKey = decrypt(config.apiKey, env.ENCRYPTION_SECRET);
        } catch {
          throw new UnauthorizedError("Failed to decrypt provider credentials");
        }

        const headers = providerDef.authHeaders(decryptedKey);
        const url = `${providerDef.baseUrl}${providerDef.modelsEndpoint}`;

        const res = await fetch(url, { headers });
        if (!res.ok) {
          return [];
        }

        const body = (await res.json()) as { data?: UpstreamModel[] };

        const NON_CHAT_PATTERNS =
          /embed|tts|whisper|dall-e|image|moderation|realtime|transcri|audio|codex|computer-use|davinci|babbage|search/i;

        return (body.data ?? [])
          .filter((m) => !NON_CHAT_PATTERNS.test(m.id))
          .map((m) => ({
            id: m.id,
            name: m.display_name ?? m.name ?? m.id,
            provider: config.provider
          }))
          .sort((a, b) => a.id.localeCompare(b.id));
      }
    );

    return c.json({ data: models });
  };
