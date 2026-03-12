import Redis from 'ioredis'

let redis: Redis | null = null

export const getRedis = (url: string): Redis => {
  if (!redis) {
    redis = new Redis(url, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    })
    redis.on('error', (err) => {
      console.error('Redis connection error:', err)
    })
  }
  return redis
}
