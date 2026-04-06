import { parseEnv } from "@raven/config";
import { createDatabase } from "@raven/db";
import { cleanupExpiredInvitations } from "./jobs/invitations";
import { deactivateExpiredKeys } from "./jobs/keys";
import { cleanupRetention } from "./jobs/retention";
import { cleanupExpiredSessions } from "./jobs/sessions";
import { cleanupExpiredVerifications } from "./jobs/verifications";

const env = parseEnv();
const db = createDatabase(env.DATABASE_URL);

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

const runAllJobs = async () => {
  await runJob("retention cleanup", () => cleanupRetention(db));
  await runJob("session cleanup", () => cleanupExpiredSessions(db));
  await runJob("verification cleanup", () => cleanupExpiredVerifications(db));
  await runJob("invitation cleanup", () => cleanupExpiredInvitations(db));
  await runJob("key deactivation", () => deactivateExpiredKeys(db));
};

console.log("Raven cron worker started");
runAllJobs();

setInterval(
  () => runJob("key deactivation", () => deactivateExpiredKeys(db)),
  HOUR
);

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
