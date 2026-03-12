import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not set");

export default defineConfig({
  dbCredentials: {
    url: databaseUrl
  },
  dialect: "postgresql",
  out: "./drizzle",
  schema: "./src/schema/*.ts"
});
