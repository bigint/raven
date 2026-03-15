import type { Database } from "@raven/db";
import { models, syncedProviders } from "@raven/db";
import { count, eq } from "drizzle-orm";
import type { Context } from "hono";
import { syncModels } from "@/lib/model-sync";

export const getAdminSyncedProviders = (db: Database) => async (c: Context) => {
  const providers = await db
    .select({
      createdAt: syncedProviders.createdAt,
      isEnabled: syncedProviders.isEnabled,
      lastSyncedAt: syncedProviders.lastSyncedAt,
      modelCount: count(models.id),
      name: syncedProviders.name,
      slug: syncedProviders.slug
    })
    .from(syncedProviders)
    .leftJoin(models, eq(models.provider, syncedProviders.slug))
    .groupBy(syncedProviders.slug);

  return c.json({ data: providers });
};

export const addSyncedProvider = (db: Database) => async (c: Context) => {
  const body = await c.req.json<{ slug: string; name: string }>();

  if (!body.slug || !body.name) {
    return c.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "slug and name are required"
        }
      },
      400
    );
  }

  const [provider] = await db
    .insert(syncedProviders)
    .values({ name: body.name, slug: body.slug })
    .onConflictDoNothing()
    .returning();

  if (!provider) {
    return c.json(
      { error: { code: "CONFLICT", message: "Provider already exists" } },
      409
    );
  }

  return c.json({ data: provider }, 201);
};

export const updateSyncedProvider = (db: Database) => async (c: Context) => {
  const slug = c.req.param("slug") as string;
  const body = await c.req.json<{ isEnabled?: boolean; name?: string }>();

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof body.isEnabled === "boolean") updates.isEnabled = body.isEnabled;
  if (typeof body.name === "string") updates.name = body.name;

  const [updated] = await db
    .update(syncedProviders)
    .set(updates)
    .where(eq(syncedProviders.slug, slug))
    .returning();

  if (!updated) {
    return c.json(
      { error: { code: "NOT_FOUND", message: "Provider not found" } },
      404
    );
  }

  return c.json({ data: updated });
};

export const deleteSyncedProvider = (db: Database) => async (c: Context) => {
  const slug = c.req.param("slug") as string;

  const [deleted] = await db
    .delete(syncedProviders)
    .where(eq(syncedProviders.slug, slug))
    .returning();

  if (!deleted) {
    return c.json(
      { error: { code: "NOT_FOUND", message: "Provider not found" } },
      404
    );
  }

  return c.json({ data: { success: true } });
};

export const triggerModelSync = (db: Database) => async (c: Context) => {
  try {
    const result = await syncModels(db);
    return c.json({ data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return c.json({ error: { code: "SYNC_ERROR", message } }, 500);
  }
};
