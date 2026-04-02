import { BigRAG } from "@bigrag/client";
import { parseEnv } from "@raven/config";
import { createDatabase } from "@raven/db";
import { cleanupExpiredInvitations } from "./jobs/invitations";
import { deactivateExpiredKeys } from "./jobs/keys";
import { cleanupRetention } from "./jobs/retention";
import { cleanupExpiredSessions } from "./jobs/sessions";
import { syncDocumentStatuses } from "./jobs/sync-statuses";
import { cleanupExpiredVerifications } from "./jobs/verifications";

const env = parseEnv();
const db = createDatabase(env.DATABASE_URL);
const bigrag = new BigRAG({
  apiKey: env.BIGRAG_API_KEY,
  baseUrl: env.BIGRAG_URL
});

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
  await runJob("document status sync", () => syncDocumentStatuses(db, bigrag));
};

console.log("Raven cron worker started");
runAllJobs();

// Every 15 minutes: document status sync
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

process.on("SIGTERM", () => {
  console.log("Cron worker shutting down");
  process.exit(0);
});
