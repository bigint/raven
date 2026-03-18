import type { Redis } from "ioredis";
import { RateLimiterRedis } from "rate-limiter-flexible";
import { RateLimitError } from "@/lib/errors";

const limiters = new Map<string, RateLimiterRedis>();

const getLimiter = (
  redis: Redis,
  prefix: string,
  points: number,
  duration: number
): RateLimiterRedis => {
  const key = `${prefix}:${points}:${duration}`;
  let limiter = limiters.get(key);
  if (!limiter) {
    limiter = new RateLimiterRedis({
      duration,
      keyPrefix: prefix,
      points,
      storeClient: redis
    });
    limiters.set(key, limiter);
  }
  return limiter;
};

const SECONDS_PER_DAY = 86_400;

export const checkRateLimit = async (
  redis: Redis,
  keyId: string,
  rpm: number | null,
  rpd: number | null
): Promise<void> => {
  if (rpm === null && rpd === null) return;

  const checks = [
    ...(rpm === null
      ? []
      : [
          getLimiter(redis, "rl:rpm", rpm, 60)
            .consume(keyId)
            .then(
              () => {},
              () => {
                throw new RateLimitError(
                  "Rate limit exceeded (requests per minute)"
                );
              }
            )
        ]),
    ...(rpd === null
      ? []
      : [
          getLimiter(redis, "rl:rpd", rpd, SECONDS_PER_DAY)
            .consume(keyId)
            .then(
              () => {},
              () => {
                throw new RateLimitError(
                  "Rate limit exceeded (requests per day)"
                );
              }
            )
        ])
  ];

  await Promise.all(checks);
};
