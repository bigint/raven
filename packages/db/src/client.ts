import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index";

export const createDatabase = (url: string) => {
  const client = postgres(url, { idle_timeout: 30, max: 20 });
  return drizzle(client, { schema });
};
