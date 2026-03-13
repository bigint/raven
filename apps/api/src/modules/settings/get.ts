import type { Database } from "@raven/db";
import { organizations, subscriptions } from "@raven/db";
import { eq } from "drizzle-orm";
import { NotFoundError } from "@/lib/errors";
import { success } from "@/lib/response";
import type { AppContext } from "@/lib/types";

export const getSettings = (db: Database) => async (c: AppContext) => {
  const orgId = c.get("orgId");
  const orgRole = c.get("orgRole");

  const [org] = await db
    .select({
      createdAt: organizations.createdAt,
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug
    })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);

  if (!org) {
    throw new NotFoundError("Organization not found");
  }

  const [sub] = await db
    .select({ plan: subscriptions.plan, status: subscriptions.status })
    .from(subscriptions)
    .where(eq(subscriptions.organizationId, orgId))
    .limit(1);

  return success(c, {
    createdAt: org.createdAt,
    id: org.id,
    name: org.name,
    plan: sub?.plan ?? "free",
    slug: org.slug,
    subscriptionStatus: sub?.status ?? "active",
    userRole: orgRole
  });
};
