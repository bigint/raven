import type { Redis } from "ioredis";

const ALPHA = 0.3;
const TTL_SECONDS = 86400 * 30; // 30 days
const COST_TTL_SECONDS = 86400 * 35;

/**
 * Lua script to atomically update latency EMA and cost in a single round trip.
 *
 * KEYS[1] = latency key
 * KEYS[2] = cost key (may be empty string if cost <= 0)
 * ARGV[1] = latencyMs
 * ARGV[2] = alpha
 * ARGV[3] = latency TTL
 * ARGV[4] = cost amount
 * ARGV[5] = cost TTL
 */
const UPDATE_METRICS_LUA = `
local existing = redis.call('GET', KEYS[1])
local latency = tonumber(ARGV[1])
local alpha = tonumber(ARGV[2])
local newAvg
if existing == false then
  newAvg = latency
else
  newAvg = alpha * latency + (1 - alpha) * tonumber(existing)
end
redis.call('SET', KEYS[1], string.format('%.2f', newAvg), 'EX', tonumber(ARGV[3]))
local cost = tonumber(ARGV[4])
if cost > 0 then
  redis.call('INCRBYFLOAT', KEYS[2], cost)
  redis.call('EXPIRE', KEYS[2], tonumber(ARGV[5]))
end
return 1
`;

let scriptLoaded = false;

const ensureScript = (redis: Redis): void => {
  if (scriptLoaded) return;
  redis.defineCommand("updateMetricsLua", {
    lua: UPDATE_METRICS_LUA,
    numberOfKeys: 2
  });
  scriptLoaded = true;
};

/**
 * Updates latency (exponential moving average) and cumulative cost
 * for a provider config in a single Redis round trip via Lua script.
 */
export const updateMetrics = async (
  redis: Redis,
  configId: string,
  latencyMs: number,
  cost: number
): Promise<void> => {
  ensureScript(redis);

  const latencyKey = `latency:${configId}`;

  let costKey = "";
  if (cost > 0) {
    const d = new Date();
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    costKey = `cost:${configId}:${monthKey}`;
  }

  await (
    redis as Redis & {
      updateMetricsLua: (...args: (string | number)[]) => Promise<number>;
    }
  ).updateMetricsLua(
    latencyKey,
    costKey,
    latencyMs,
    ALPHA,
    TTL_SECONDS,
    cost,
    COST_TTL_SECONDS
  );
};
