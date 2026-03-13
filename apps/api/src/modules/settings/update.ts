import type { Database } from "@raven/db";
import { organizations, subscriptions } from "@raven/db";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { publishEvent } from "@/lib/events";
import { success } from "@/lib/response";
import type { AppContextWithJson } from "@/lib/types";
import { logAudit } from "@/modules/audit-logs/index";
import type { updateOrgSchema } from "./schema";

type Body = z.infer<typeof updateOrgSchema>;

export const updateSettings =
  (db: Database) => async (c: AppContextWithJson<Body>) => {
    const orgId = c.get("orgId");
    const orgRole = c.get("orgRole");
    const user = c.get("user");

    if (orgRole !== "owner" && orgRole !== "admin") {
      throw new ForbiddenError(
        "Only owners and admins can update organization settings"
      );
    }

    const { name, slug } = c.req.valid("json");

    if (!name && !slug) {
      throw new ValidationError("At least one field must be provided");
    }

    const updates: Record<string, unknown> = {};
    if (name) updates.name = name;
    if (slug) updates.slug = slug;
    updates.updatedAt = new Date();

    const [updated] = await db
      .update(organizations)
      .set(updates)
      .where(eq(organizations.id, orgId))
      .returning();

    if (!updated) {
      throw new NotFoundError("Organization not found");
    }

    const [sub] = await db
      .select({ plan: subscriptions.plan, status: subscriptions.status })
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, orgId))
      .limit(1);

    const settings = {
      createdAt: updated.createdAt,
      id: updated.id,
      name: updated.name,
      plan: sub?.plan ?? "free",
      slug: updated.slug,
      subscriptionStatus: sub?.status ?? "active",
      userRole: orgRole
    };
    void publishEvent(orgId, "settings.updated", settings);
    void logAudit(db, {
      action: "org.updated",
      actorId: user.id,
      metadata: { name, slug },
      orgId,
      resourceId: orgId,
      resourceType: "organization"
    });
    return success(c, settings);
  };
