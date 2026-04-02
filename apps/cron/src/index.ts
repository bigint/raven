import { parseEnv } from "@raven/config";
import { createDatabase } from "@raven/db";
import Redis from "ioredis";
import { cleanupExpiredInvitations } from "./jobs/invitations";
import { deactivateExpiredKeys } from "./jobs/keys";
import { recrawlDueDocuments } from "./jobs/recrawl";
import { cleanupRetention } from "./jobs/retention";
import { cleanupExpiredSessions } from "./jobs/sessions";
import { syncDocumentStatuses } from "./jobs/sync-statuses";
import { cleanupExpiredVerifications } from "./jobs/verifications";
import { BigRAGClient } from "./lib/bigrag";
import { startWorker } from "./knowledge/worker";

const env = parseEnv();
const db = createDatabase(env.DATABASE_URL);
const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 3
});
const bigrag = new BigRAGClient(env.BIGRAG_URL, env.BIGRAG_API_KEY);

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const runJob = async (name: string, fn: () => Promise<void>) => {
  try {
    console.log(`[${new Date().toISOString()}] Running ${name}...`);
    await fn();
    console.log(`[${new Date().toISOString()}] ${name} complete`);
  } catch (err) {
    console.error(`${name} failed:`, err);
  }
};

// Run all jobs on startup
const runAllJobs = async () => {
  await runJob("retention cleanup", () => cleanupRetention(db));
  await runJob("session cleanup", () => cleanupExpiredSessions(db));
  await runJob("verification cleanup", () => cleanupExpiredVerifications(db));
  await runJob("invitation cleanup", () => cleanupExpiredInvitations(db));
  await runJob("key deactivation", () => deactivateExpiredKeys(db));
  await runJob("url recrawl", () => recrawlDueDocuments(db, redis));
  await runJob("document status sync", () => syncDocumentStatuses(db, bigrag));
};

const stopWorker = startWorker({ bigrag, db, redis });

console.log("Raven cron worker started");
runAllJobs();

// Every 15 minutes: url recrawl + document status sync
setInterval(
  () => runJob("url recrawl", () => recrawlDueDocuments(db, redis)),
  FIFTEEN_MINUTES
);
setInterval(
  () => runJob("document status sync", () => syncDocumentStatuses(db, bigrag)),
  FIFTEEN_MINUTES
);

// Hourly: expired key deactivation
setInterval(
  () => runJob("key deactivation", () => deactivateExpiredKeys(db)),
  HOUR
);

// Daily: cleanup jobs
setInterval(() => runJob("retention cleanup", () => cleanupRetention(db)), DAY);
setInterval(
  () => runJob("session cleanup", () => cleanupExpiredSessions(db)),
  DAY
);
setInterval(
  () => runJob("verification cleanup", () => cleanupExpiredVerifications(db)),
  DAY
);
setInterval(
  () => runJob("invitation cleanup", () => cleanupExpiredInvitations(db)),
  DAY
);

redis.on("error", (err) => {
  console.error("Redis connection error:", err);
});

process.on("SIGTERM", () => {
  console.log("Cron worker shutting down");
  stopWorker();
  redis.disconnect();
  process.exit(0);
});
