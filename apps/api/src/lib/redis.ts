import Redis from "ioredis";
import { log } from "./logger";

let redis: Redis | null = null;

export const getRedis = (url: string): Redis => {
  if (!redis) {
    redis = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 3
    });
    redis.on("error", (err) => {
      log.error("Redis connection error", err);
    });
  }
  return redis;
};
