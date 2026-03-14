import type { Database } from "@raven/db";
import { providerConfigs } from "@raven/db";
import { and, eq } from "drizzle-orm";
import type { Redis } from "ioredis";

export type RoutingStrategy =
  | "random"
  | "round-robin"
  | "least-latency"
  | "least-cost";

/**
 * Resolves a provider config ID using the specified routing strategy.
 * Falls back to random selection if the chosen strategy cannot determine a winner.
 */
export const resolveWithStrategy = async (
  db: Database,
  redis: Redis,
  orgId: string,
  providerName: string,
  strategy: RoutingStrategy = "random"
): Promise<string> => {
  const configs = await db
    .select({ id: providerConfigs.id })
    .from(providerConfigs)
    .where(
      and(
        eq(providerConfigs.organizationId, orgId),
        eq(providerConfigs.provider, providerName),
        eq(providerConfigs.isEnabled, true)
      )
    )
    .limit(50);

  if (configs.length === 0) {
    throw new Error(`No enabled configs for provider '${providerName}'`);
  }

  const first = configs[0] as { id: string };
  if (configs.length === 1) {
    return first.id;
  }

  switch (strategy) {
    case "round-robin":
      return roundRobin(redis, orgId, providerName, configs);
    case "least-latency":
      return leastLatency(redis, configs);
    case "least-cost":
      return leastCost(redis, configs);
    default:
      return pickRandom(configs);
  }
};

const pickRandom = (configs: { id: string }[]): string => {
  const idx = Math.floor(Math.random() * configs.length);
  const picked = configs[idx] as { id: string };
  return picked.id;
};

const roundRobin = async (
  redis: Redis,
  orgId: string,
  provider: string,
  configs: { id: string }[]
): Promise<string> => {
  const key = `rr:${orgId}:${provider}`;
  const counter = await redis.incr(key);
  await redis.expire(key, 86400);
  const idx = (counter - 1) % configs.length;
  const picked = configs[idx] as { id: string };
  return picked.id;
};

const leastLatency = async (
  redis: Redis,
  configs: { id: string }[]
): Promise<string> => {
  const keys = configs.map((c) => `latency:${c.id}`);
  const values = await redis.mget(...keys);

  let bestIdx = -1;
  let bestLatency = Number.POSITIVE_INFINITY;

  for (let i = 0; i < configs.length; i++) {
    const raw = values[i];
    const latency =
      raw !== undefined && raw !== null
        ? Number.parseFloat(raw)
        : Number.POSITIVE_INFINITY;
    if (latency < bestLatency) {
      bestLatency = latency;
      bestIdx = i;
    }
  }

  if (bestIdx === -1 || bestLatency === Number.POSITIVE_INFINITY) {
    return pickRandom(configs);
  }

  const best = configs[bestIdx] as { id: string };
  return best.id;
};

const leastCost = async (
  redis: Redis,
  configs: { id: string }[]
): Promise<string> => {
  const now = new Date();
  const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

  const keys = configs.map((c) => `cost:${c.id}:${monthKey}`);
  const values = await redis.mget(...keys);

  let bestIdx = -1;
  let bestCost = Number.POSITIVE_INFINITY;

  for (let i = 0; i < configs.length; i++) {
    const raw = values[i];
    const cost = raw !== undefined && raw !== null ? Number.parseFloat(raw) : 0;
    if (cost < bestCost) {
      bestCost = cost;
      bestIdx = i;
    }
  }

  if (bestIdx === -1) return pickRandom(configs);
  const best = configs[bestIdx] as { id: string };
  return best.id;
};
