import { createId } from "@paralleldrive/cuid2";
import type { Database } from "@raven/db";
import { invitations, members, organizations } from "@raven/db";
import { and, eq } from "drizzle-orm";
import type { Context } from "hono";
import { AppError, NotFoundError, UnauthorizedError } from "@/lib/errors";
import { created, success } from "@/lib/response";

export const listInvitations = (db: Database) => async (c: Context) => {
  const user = c.get("user" as never) as
    | { id: string; email: string }
    | undefined;
  if (!user) {
    throw new UnauthorizedError("Not authenticated");
  }

  const pending = await db
    .select({
      expiresAt: invitations.expiresAt,
      id: invitations.id,
      organizationId: invitations.organizationId,
      orgName: organizations.name,
      role: invitations.role
    })
    .from(invitations)
    .innerJoin(organizations, eq(invitations.organizationId, organizations.id))
    .where(
      and(eq(invitations.email, user.email), eq(invitations.status, "pending"))
    );

  return success(c, pending);
};

export const acceptInvitation = (db: Database) => async (c: Context) => {
  const user = c.get("user" as never) as
    | { id: string; email: string }
    | undefined;
  if (!user) {
    throw new UnauthorizedError("Not authenticated");
  }

  const id = c.req.param("id") as string;

  const [invitation] = await db
    .select()
    .from(invitations)
    .where(
      and(
        eq(invitations.id, id),
        eq(invitations.email, user.email),
        eq(invitations.status, "pending")
      )
    )
    .limit(1);

  if (!invitation) {
    throw new NotFoundError("Invitation not found");
  }

  if (new Date() > invitation.expiresAt) {
    throw new AppError("Invitation has expired", 410, "GONE");
  }

  const memberId = createId();

  await db.transaction(async (tx) => {
    await tx.insert(members).values({
      id: memberId,
      organizationId: invitation.organizationId,
      role: invitation.role,
      userId: user.id
    });
    await tx
      .update(invitations)
      .set({ status: "accepted" })
      .where(eq(invitations.id, id));
  });

  return created(c, {
    id: memberId,
    organizationId: invitation.organizationId,
    role: invitation.role,
    userId: user.id
  });
};

export const declineInvitation = (db: Database) => async (c: Context) => {
  const user = c.get("user" as never) as
    | { id: string; email: string }
    | undefined;
  if (!user) {
    throw new UnauthorizedError("Not authenticated");
  }

  const id = c.req.param("id") as string;

  const [invitation] = await db
    .select()
    .from(invitations)
    .where(
      and(
        eq(invitations.id, id),
        eq(invitations.email, user.email),
        eq(invitations.status, "pending")
      )
    )
    .limit(1);

  if (!invitation) {
    throw new NotFoundError("Invitation not found");
  }

  await db
    .update(invitations)
    .set({ status: "declined" })
    .where(eq(invitations.id, id));

  return success(c, { message: "Invitation declined" });
};
