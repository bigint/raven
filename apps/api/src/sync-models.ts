import { parseEnv } from "@raven/config";
import { createDatabase } from "@raven/db";
import { seedDefaultProviders, syncModels } from "./lib/model-sync";

const env = parseEnv();
const db = createDatabase(env.DATABASE_URL);

console.log("Starting model sync...");
await seedDefaultProviders(db);
const result = await syncModels(db);
console.log(`Done: ${result.synced} synced, ${result.removed} removed`);
process.exit(0);
