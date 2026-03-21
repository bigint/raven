import { parseEnv } from "@raven/config";
import { createDatabase } from "@raven/db";
import { cleanupRetention } from "./modules/admin/retention";

const env = parseEnv();
const db = createDatabase(env.DATABASE_URL);

console.log("Raven cron worker started");

const runRetentionCleanup = async () => {
  try {
    console.log(`[${new Date().toISOString()}] Running retention cleanup...`);
    await cleanupRetention(db);
    console.log(`[${new Date().toISOString()}] Retention cleanup complete`);
  } catch (err) {
    console.error("Retention cleanup failed:", err);
  }
};

setInterval(runRetentionCleanup, 24 * 60 * 60 * 1000);

process.on("SIGTERM", () => {
  console.log("Cron worker shutting down");
  process.exit(0);
});
