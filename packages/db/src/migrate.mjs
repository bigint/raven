import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(databaseUrl, { max: 1 });
const db = drizzle(sql);

// Advisory lock prevents concurrent migration from multiple containers
const lockId = 728191; // arbitrary fixed ID for migration lock
try {
  await sql`SELECT pg_advisory_lock(${lockId})`;
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations complete.");
} finally {
  await sql`SELECT pg_advisory_unlock(${lockId})`;
  await sql.end();
}
