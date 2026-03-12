import type { Database } from "@raven/db";
import { invitations, members, users } from "@raven/db";
import { and, eq } from "drizzle-orm";
import type { Context } from "hono";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError
} from "@/lib/errors";
import { publishEvent } from "@/lib/events";
import { created, success } from "@/lib/response";
import { logAudit } from "@/modules/audit-logs/index";
import { inviteSchema } from "./schema";

export const inviteUser = (db: Database) => async (c: Context) => {
  const orgId = c.get("orgId" as never) as string;
  const orgRole = c.get("orgRole" as never) as string;

  if (orgRole !== "owner" && orgRole !== "admin") {
    throw new ForbiddenError("Only owners and admins can invite members");
  }

  const body = await c.req.json();
  const result = inviteSchema.safeParse(body);

  if (!result.success) {
    throw new ValidationError("Invalid request body", {
      errors: result.error.flatten().fieldErrors
    });
  }

  const { email, role } = result.data;

  // Check if user is already a member
  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser) {
    const [existingMember] = await db
      .select({ id: members.id })
      .from(members)
      .where(
        and(
          eq(members.organizationId, orgId),
          eq(members.userId, existingUser.id)
        )
      )
      .limit(1);

    if (existingMember) {
      throw new ConflictError("User is already a member of this organization");
    }
  }

  // Check for existing pending invitation
  const [existingInvitation] = await db
    .select({ id: invitations.id })
    .from(invitations)
    .where(
      and(eq(invitations.organizationId, orgId), eq(invitations.email, email))
    )
    .limit(1);

  if (existingInvitation) {
    throw new ConflictError("An invitation for this email already exists");
  }

  const currentUser = c.get("user" as never) as { id: string };
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const [record] = await db
    .insert(invitations)
    .values({
      email,
      expiresAt,
      inviterId: currentUser.id,
      organizationId: orgId,
      role
    })
    .returning();

  const safe = record as NonNullable<typeof record>;
  void publishEvent(orgId, "invitation.created", safe);
  void logAudit(db, {
    action: "member.added",
    actorId: currentUser.id,
    metadata: { email, role },
    orgId,
    resourceId: safe.id,
    resourceType: "invitation"
  });
  return created(c, safe);
};

export const listInvitations = (db: Database) => async (c: Context) => {
  const orgId = c.get("orgId" as never) as string;
  const orgRole = c.get("orgRole" as never) as string;

  if (orgRole !== "owner" && orgRole !== "admin") {
    throw new ForbiddenError("Only owners and admins can view invitations");
  }

  const rows = await db
    .select()
    .from(invitations)
    .where(eq(invitations.organizationId, orgId));

  return success(c, rows);
};

export const revokeInvitation = (db: Database) => async (c: Context) => {
  const orgId = c.get("orgId" as never) as string;
  const orgRole = c.get("orgRole" as never) as string;
  const user = c.get("user" as never) as { id: string };
  const id = c.req.param("id") as string;

  if (orgRole !== "owner" && orgRole !== "admin") {
    throw new ForbiddenError("Only owners and admins can revoke invitations");
  }

  const [existing] = await db
    .select({ id: invitations.id })
    .from(invitations)
    .where(and(eq(invitations.id, id), eq(invitations.organizationId, orgId)))
    .limit(1);

  if (!existing) {
    throw new NotFoundError("Invitation not found");
  }

  await db
    .delete(invitations)
    .where(and(eq(invitations.id, id), eq(invitations.organizationId, orgId)));

  void publishEvent(orgId, "invitation.revoked", { id });
  void logAudit(db, {
    action: "member.removed",
    actorId: user.id,
    orgId,
    resourceId: id,
    resourceType: "invitation"
  });
  return success(c, { success: true });
};
