import { createId } from "@paralleldrive/cuid2";
import type { Database } from "@raven/db";
import { members, organizations, subscriptions } from "@raven/db";
import type { Plan } from "@raven/types";
import { and, eq, isNull } from "drizzle-orm";
import type { z } from "zod";
import { UnauthorizedError } from "@/lib/errors";
import { created, success } from "@/lib/response";
import type { AuthContext, AuthContextWithJson } from "@/lib/types";
import type { createOrgSchema } from "./schema";

export const listOrgs = (db: Database) => async (c: AuthContext) => {
  const user = c.get("user");
  if (!user) {
    throw new UnauthorizedError("Not authenticated");
  }

  const userMembers = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      plan: subscriptions.plan,
      role: members.role,
      slug: organizations.slug
    })
    .from(members)
    .innerJoin(organizations, eq(members.organizationId, organizations.id))
    .leftJoin(subscriptions, eq(subscriptions.organizationId, organizations.id))
    .where(and(eq(members.userId, user.id), isNull(organizations.deletedAt)));

  const result = userMembers.map((m) => ({
    ...m,
    plan: (m.plan ?? "free") as Plan
  }));

  return success(c, result);
};

type Body = z.infer<typeof createOrgSchema>;

export const createOrg =
  (db: Database) => async (c: AuthContextWithJson<Body>) => {
    const user = c.get("user");
    if (!user) {
      throw new UnauthorizedError("Not authenticated");
    }

    const data = c.req.valid("json");

    const name = data.name;
    const slug = data.slug?.trim() || `org-${createId()}`;
    const orgId = createId();

    await db.transaction(async (tx) => {
      await tx.insert(organizations).values({ id: orgId, name, slug });
      await tx.insert(members).values({
        id: createId(),
        organizationId: orgId,
        role: "owner",
        userId: user.id
      });
    });

    return created(c, { id: orgId, name, role: "owner", slug });
  };
