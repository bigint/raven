import type { Database } from "@raven/db";
import { invitations, members, users } from "@raven/db";
import { and, count, eq } from "drizzle-orm";
import type { z } from "zod";
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { publishEvent } from "@/lib/events";
import { created, success } from "@/lib/response";
import type { AppContext, AppContextWithJson } from "@/lib/types";
import { logAudit } from "@/modules/audit-logs/index";
import { checkResourceLimit } from "@/modules/proxy/plan-gate";
import type { inviteSchema } from "./schema";

type InviteBody = z.infer<typeof inviteSchema>;

export const inviteUser =
  (db: Database) => async (c: AppContextWithJson<InviteBody>) => {
    const orgId = c.get("orgId");
    const orgRole = c.get("orgRole");

    if (orgRole !== "owner" && orgRole !== "admin") {
      throw new ForbiddenError("Only owners and admins can invite members");
    }

    const { email, role } = c.req.valid("json");

    // Check seat limit, existing user, and pending invitation in parallel
    const [
      [memberCount],
      [inviteCount],
      [existingUser],
      [existingInvitation]
    ] = await Promise.all([
      db
        .select({ value: count() })
        .from(members)
        .where(eq(members.organizationId, orgId)),
      db
        .select({ value: count() })
        .from(invitations)
        .where(eq(invitations.organizationId, orgId)),
      db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1),
      db
        .select({ id: invitations.id })
        .from(invitations)
        .where(
          and(
            eq(invitations.organizationId, orgId),
            eq(invitations.email, email)
          )
        )
        .limit(1)
    ]);

    const totalSeats = (memberCount?.value ?? 0) + (inviteCount?.value ?? 0);
    await checkResourceLimit(db, orgId, "maxSeats", totalSeats);

    if (existingInvitation) {
      throw new ConflictError("An invitation for this email already exists");
    }

    // Check if user is already a member
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
        throw new ConflictError(
          "User is already a member of this organization"
        );
      }
    }

    const currentUser = c.get("user");
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

export const listInvitations = (db: Database) => async (c: AppContext) => {
  const orgId = c.get("orgId");
  const orgRole = c.get("orgRole");

  if (orgRole !== "owner" && orgRole !== "admin") {
    throw new ForbiddenError("Only owners and admins can view invitations");
  }

  const rows = await db
    .select()
    .from(invitations)
    .where(eq(invitations.organizationId, orgId));

  return success(c, rows);
};

export const revokeInvitation = (db: Database) => async (c: AppContext) => {
  const orgId = c.get("orgId");
  const orgRole = c.get("orgRole");
  const user = c.get("user");
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
