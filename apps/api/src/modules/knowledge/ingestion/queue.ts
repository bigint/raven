import type { Redis } from "ioredis";
import { log } from "@/lib/logger";

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

export const enqueueJob = async (
  redis: Redis,
  job: Omit<IngestionJob, "attempt" | "createdAt">
): Promise<void> => {
  const full: IngestionJob = {
    ...job,
    attempt: 0,
    createdAt: new Date().toISOString()
  };
  await redis.lpush(QUEUE_KEY, JSON.stringify(full));
  log.info("Enqueued ingestion job", {
    documentId: job.documentId,
    type: job.type
  });
};

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
