import type { Redis } from "ioredis";
import { log } from "./logger";

const QUEUE_KEY = "knowledge:jobs";
const PROCESSING_KEY = "knowledge:jobs:processing";
const MAX_RETRIES = 3;

export interface IngestionJob {
  readonly id: string;
  readonly documentId: string;
  readonly collectionId: string;
  readonly type: "file" | "url" | "image";
  readonly filePath?: string;
  readonly sourceUrl?: string;
  readonly attempt: number;
  readonly createdAt: string;
}

export const dequeueJob = async (
  redis: Redis,
  timeoutSeconds = 5
): Promise<IngestionJob | null> => {
  const result = await redis.brpoplpush(
    QUEUE_KEY,
    PROCESSING_KEY,
    timeoutSeconds
  );
  if (!result) return null;
  return JSON.parse(result) as IngestionJob;
};

export const completeJob = async (
  redis: Redis,
  job: IngestionJob
): Promise<void> => {
  await redis.lrem(PROCESSING_KEY, 1, JSON.stringify(job));
};

export const retryJob = async (
  redis: Redis,
  job: IngestionJob
): Promise<boolean> => {
  await redis.lrem(PROCESSING_KEY, 1, JSON.stringify(job));
  if (job.attempt >= MAX_RETRIES) {
    log.error("Job exceeded max retries", undefined, {
      documentId: job.documentId
    });
    return false;
  }
  const retried: IngestionJob = { ...job, attempt: job.attempt + 1 };
  const delayMs = 2 ** retried.attempt * 1000;
  const executeAt = Date.now() + delayMs;
  await redis.zadd(
    "knowledge:jobs:delayed",
    executeAt,
    JSON.stringify(retried)
  );
  return true;
};

/** Recover stuck jobs from the processing list back to the queue (called on worker startup) */
export const recoverStuckJobs = async (redis: Redis): Promise<void> => {
  const stuck = await redis.llen(PROCESSING_KEY);
  if (stuck === 0) return;

  const items = await redis.lrange(PROCESSING_KEY, 0, -1);
  if (items.length === 0) return;

  const pipeline = redis.pipeline();
  for (const item of items) {
    pipeline.lpush(QUEUE_KEY, item);
  }
  pipeline.del(PROCESSING_KEY);
  await pipeline.exec();

  log.info("Recovered stuck jobs", { count: items.length });
};

export const promoteDelayedJobs = async (redis: Redis): Promise<void> => {
  const now = Date.now();
  const ready = await redis.zrangebyscore("knowledge:jobs:delayed", 0, now);
  if (ready.length === 0) return;
  const pipeline = redis.pipeline();
  for (const item of ready) {
    pipeline.lpush(QUEUE_KEY, item);
    pipeline.zrem("knowledge:jobs:delayed", item);
  }
  await pipeline.exec();
};
