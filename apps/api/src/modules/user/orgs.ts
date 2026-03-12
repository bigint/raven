import { createId } from "@paralleldrive/cuid2";
import type { Database } from "@raven/db";
import { members, organizations } from "@raven/db";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { UnauthorizedError, ValidationError } from "@/lib/errors";
import { created, success } from "@/lib/response";
import { createOrgSchema } from "./schema";

export const listOrgs = (db: Database) => async (c: Context) => {
  const user = c.get("user" as never) as { id: string } | undefined;
  if (!user) {
    throw new UnauthorizedError("Not authenticated");
  }

  const userMembers = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      role: members.role,
      slug: organizations.slug
    })
    .from(members)
    .innerJoin(organizations, eq(members.organizationId, organizations.id))
    .where(eq(members.userId, user.id));

  return success(c, userMembers);
};

export const createOrg = (db: Database) => async (c: Context) => {
  const user = c.get("user" as never) as { id: string } | undefined;
  if (!user) {
    throw new UnauthorizedError("Not authenticated");
  }

  const body = await c.req.json();
  const result = createOrgSchema.safeParse(body);

  if (!result.success) {
    throw new ValidationError("Invalid request body", {
      errors: result.error.flatten().fieldErrors
    });
  }

  const name = result.data.name;
  const slug = result.data.slug?.trim() || `org-${createId()}`;
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
