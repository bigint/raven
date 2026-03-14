import type { Redis } from "ioredis";
import { RateLimitError } from "@/lib/errors";

export interface RateLimitInput {
  redis: Redis;
  keyId: string;
  rpm: number | null;
  rpd: number | null;
}

export const checkRateLimit = async (
  redis: Redis,
  keyId: string,
  rpm: number | null,
  rpd: number | null
): Promise<void> => {
  if (rpm === null && rpd === null) return;

  const now = Date.now();
  const pipeline = redis.pipeline();

  // RPM commands (indexes 0-3)
  if (rpm !== null) {
    const rpmKey = `rl:rpm:${keyId}`;
    const windowStart = now - 60_000;
    pipeline.zremrangebyscore(rpmKey, "-inf", windowStart);
    pipeline.zadd(rpmKey, now, `${now}-${Math.random()}`);
    pipeline.zcard(rpmKey);
    pipeline.expire(rpmKey, 60);
  }

  // RPD commands (indexes 4-7 if RPM exists, 0-3 if not)
  if (rpd !== null) {
    const rpdKey = `rl:rpd:${keyId}`;
    const dayStart = now - 86_400_000;
    pipeline.zremrangebyscore(rpdKey, "-inf", dayStart);
    pipeline.zadd(rpdKey, now, `${now}-${Math.random()}`);
    pipeline.zcard(rpdKey);
    pipeline.expire(rpdKey, 86400);
  }

  const results = await pipeline.exec();
  if (!results) return;

  let offset = 0;

  if (rpm !== null) {
    const count = (results[2]?.[1] as number) ?? 0;
    if (count > rpm) {
      throw new RateLimitError("Rate limit exceeded (requests per minute)");
    }
    offset = 4;
  }

  if (rpd !== null) {
    const count = (results[offset + 2]?.[1] as number) ?? 0;
    if (count > rpd) {
      throw new RateLimitError("Rate limit exceeded (requests per day)");
    }
  }
};
