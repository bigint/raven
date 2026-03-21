import type { Redis } from "ioredis";

let redisInstance: Redis | null = null;

export const initEventBus = (redis: Redis): void => {
  redisInstance = redis;
};

export const getEventRedis = (): Redis | null => redisInstance;

export const publishEvent = async (
  type: string,
  data: unknown
): Promise<void> => {
  if (!redisInstance) return;
  const event = { data, timestamp: new Date().toISOString(), type };
  await redisInstance
    .publish("raven:events", JSON.stringify(event))
    .catch((err) => {
      console.error("Failed to publish event:", err);
    });
};
