import { parseEnv } from "@raven/config";
import { createDatabase } from "@raven/db";
import { cleanupRetention } from "./modules/admin/retention";
import { syncModelsJob } from "./modules/cron/sync-models";
import { getRedis } from "./lib/redis";

const env = parseEnv();
const db = createDatabase(env.DATABASE_URL);
const redis = getRedis(env.REDIS_URL);

console.log("Raven cron worker started");

const runModelSync = async () => {
  try {
    console.log(`[${new Date().toISOString()}] Running model sync...`);
    await syncModelsJob(db, redis);
    console.log(`[${new Date().toISOString()}] Model sync complete`);
  } catch (err) {
    console.error("Model sync failed:", err);
  }
};

const runRetentionCleanup = async () => {
  try {
    console.log(`[${new Date().toISOString()}] Running retention cleanup...`);
    await cleanupRetention(db);
    console.log(`[${new Date().toISOString()}] Retention cleanup complete`);
  } catch (err) {
    console.error("Retention cleanup failed:", err);
  }
};

await runModelSync();
setInterval(runModelSync, 60 * 60 * 1000);
setInterval(runRetentionCleanup, 24 * 60 * 60 * 1000);

process.on("SIGTERM", () => {
  console.log("Cron worker shutting down");
  process.exit(0);
});
