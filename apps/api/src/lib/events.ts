import type { Redis } from 'ioredis'

let redisInstance: Redis | null = null

export const initEventBus = (redis: Redis): void => {
  redisInstance = redis
}

export const getEventRedis = (): Redis | null => redisInstance

export const publishEvent = async (orgId: string, type: string, data: unknown): Promise<void> => {
  if (!redisInstance) return
  const event = { type, data, timestamp: new Date().toISOString() }
  await redisInstance.publish(`org:${orgId}:events`, JSON.stringify(event)).catch((err) => {
    console.error('Failed to publish event:', err)
  })
}
