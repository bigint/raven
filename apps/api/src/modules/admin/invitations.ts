import { createId } from "@paralleldrive/cuid2";
import type { Database } from "@raven/db";
import { invitations, users } from "@raven/db";
import { sendInvitationEmail } from "@raven/email";
import { and, desc, eq, isNull } from "drizzle-orm";
import type { Context } from "hono";
import { z } from "zod";
import { getEmailConfig } from "@/lib/email-config";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { created, success } from "@/lib/response";
import { logAudit } from "@/modules/audit-logs/log";

const INVITE_EXPIRY_DAYS = 7;

const createInvitationSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member", "viewer"]).default("member")
});

export const createInvitation =
  (db: Database, appUrl: string) => async (c: Context) => {
    const body = await c.req.json();
    const parsed = createInvitationSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Invalid input");
    }

    const { email, role } = parsed.data;
    const currentUser = c.get("user");

    // Check if user already exists
    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser) {
      throw new ConflictError("User with this email already exists");
    }

    // Check if there's already a pending invitation for this email
    const [existingInvite] = await db
      .select({ id: invitations.id })
      .from(invitations)
      .where(and(eq(invitations.email, email), isNull(invitations.acceptedAt)))
      .limit(1);

    if (existingInvite) {
      throw new ConflictError(
        "An invitation for this email is already pending"
      );
    }

    const token = createId();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

    const [invitation] = await db
      .insert(invitations)
      .values({
        email,
        expiresAt,
        invitedBy: currentUser.id,
        role,
        token
      })
      .returning();

    if (!invitation) {
      throw new ValidationError("Failed to create invitation");
    }

    await logAudit(db, {
      action: "invitation.created",
      actorId: currentUser.id,
      metadata: { email, role },
      resourceId: invitation.id,
      resourceType: "invitation"
    });

    // Send invitation email (best-effort)
    const inviteUrl = `${appUrl}/sign-up?token=${token}`;
    try {
      const emailConfig = await getEmailConfig(db);
      if (emailConfig) {
        await sendInvitationEmail(
          emailConfig,
          email,
          currentUser.name,
          "Raven",
          inviteUrl
        );
      }
    } catch {
      // Email sending is best-effort — invite link still works
    }

    return created(c, {
      email: invitation.email,
      expiresAt: invitation.expiresAt,
      id: invitation.id,
      inviteUrl,
      role: invitation.role
    });
  };

export const listInvitations = (db: Database) => async (c: Context) => {
  const rows = await db
    .select({
      acceptedAt: invitations.acceptedAt,
      createdAt: invitations.createdAt,
      email: invitations.email,
      expiresAt: invitations.expiresAt,
      id: invitations.id,
      invitedBy: invitations.invitedBy,
      role: invitations.role
    })
    .from(invitations)
    .where(isNull(invitations.acceptedAt))
    .orderBy(desc(invitations.createdAt));

  return success(c, rows);
};

export const deleteInvitation = (db: Database) => async (c: Context) => {
  const id = c.req.param("id") as string;
  const currentUser = c.get("user");

  const [deleted] = await db
    .delete(invitations)
    .where(and(eq(invitations.id, id), isNull(invitations.acceptedAt)))
    .returning();

  if (!deleted) {
    throw new NotFoundError("Invitation not found");
  }

  await logAudit(db, {
    action: "invitation.revoked",
    actorId: currentUser.id,
    metadata: { email: deleted.email },
    resourceId: id,
    resourceType: "invitation"
  });

  return success(c, { deleted: true });
};
