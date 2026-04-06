import type { Database } from "@raven/db";
import { invitations, users } from "@raven/db";
import { and, eq, gt, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { NotFoundError } from "@/lib/errors";
import { success } from "@/lib/response";

export const createInvitationsModule = (db: Database) => {
  const app = new Hono();

  app.get("/:token", async (c) => {
    const token = c.req.param("token") as string;

    const [invitation] = await db
      .select({
        email: invitations.email,
        expiresAt: invitations.expiresAt,
        id: invitations.id,
        role: invitations.role
      })
      .from(invitations)
      .where(
        and(
          eq(invitations.token, token),
          isNull(invitations.acceptedAt),
          gt(invitations.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!invitation) {
      throw new NotFoundError("Invalid or expired invitation");
    }

    return success(c, {
      email: invitation.email,
      role: invitation.role
    });
  });

  app.post("/:token/accept", async (c) => {
    const token = c.req.param("token") as string;
    const { email } = await c.req.json<{ email: string }>();

    const [invitation] = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.token, token),
          eq(invitations.email, email),
          isNull(invitations.acceptedAt),
          gt(invitations.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!invitation) {
      throw new NotFoundError("Invalid or expired invitation");
    }

    await db
      .update(invitations)
      .set({ acceptedAt: new Date() })
      .where(eq(invitations.id, invitation.id));

    // Update user role to the invited role
    await db
      .update(users)
      .set({ role: invitation.role, updatedAt: new Date() })
      .where(eq(users.email, email));

    return success(c, { accepted: true });
  });

  return app;
};
