import type { Database } from "@raven/db";
import { syncedProviders } from "@raven/db";
import { eq } from "drizzle-orm";
import { success } from "@/lib/response";
import type { AppContext } from "@/lib/types";

export const listAvailableProviders =
  (db: Database) => async (c: AppContext) => {
    const providers = await db
      .select({ name: syncedProviders.name, slug: syncedProviders.slug })
      .from(syncedProviders)
      .where(eq(syncedProviders.isEnabled, true));

    return success(c, providers);
  };
