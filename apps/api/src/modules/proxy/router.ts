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
    );

  if (configs.length === 0) {
    throw new Error(`No enabled configs for provider '${providerName}'`);
  }

  if (configs.length === 1) {
    return configs[0].id;
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
  return configs[idx].id;
};

const roundRobin = async (
  redis: Redis,
  orgId: string,
  provider: string,
  configs: { id: string }[]
): Promise<string> => {
  const key = `rr:${orgId}:${provider}`;
  const counter = await redis.incr(key);
  // Set a TTL so stale counters don't linger forever
  await redis.expire(key, 86400);
  const idx = (counter - 1) % configs.length;
  return configs[idx].id;
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
    // Configs with no recorded latency get the lowest priority
    const latency =
      raw !== null ? Number.parseFloat(raw) : Number.POSITIVE_INFINITY;
    if (latency < bestLatency) {
      bestLatency = latency;
      bestIdx = i;
    }
  }

  // If no latency data exists for any config, fall back to random
  if (bestIdx === -1 || bestLatency === Number.POSITIVE_INFINITY) {
    return pickRandom(configs);
  }

  return configs[bestIdx].id;
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
    // Configs with no recorded cost are treated as zero spend
    const cost = raw !== null ? Number.parseFloat(raw) : 0;
    if (cost < bestCost) {
      bestCost = cost;
      bestIdx = i;
    }
  }

  return bestIdx === -1 ? pickRandom(configs) : configs[bestIdx].id;
};
