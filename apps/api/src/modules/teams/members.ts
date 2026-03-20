import type { Database } from "@raven/db";
import { members, users } from "@raven/db";
import { and, eq } from "drizzle-orm";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { publishEvent } from "@/lib/events";
import { success } from "@/lib/response";
import type { AppContext } from "@/lib/types";
import { logAudit } from "@/modules/audit-logs/index";

export const listMembers = (db: Database) => async (c: AppContext) => {
  const orgId = c.get("orgId");

  const rows = await db
    .select({
      createdAt: members.createdAt,
      id: members.id,
      role: members.role,
      userEmail: users.email,
      userId: members.userId,
      userName: users.name
    })
    .from(members)
    .innerJoin(users, eq(members.userId, users.id))
    .where(eq(members.organizationId, orgId))
    .limit(200);

  return success(
    c,
    rows.map((r) => ({
      email: r.userEmail,
      id: r.id,
      joinedAt: r.createdAt,
      name: r.userName,
      role: r.role,
      userId: r.userId
    }))
  );
};

export const removeMember = (db: Database) => async (c: AppContext) => {
  const orgId = c.get("orgId");
  const orgRole = c.get("orgRole");
  const currentUser = c.get("user");
  const id = c.req.param("id") as string;

  if (orgRole !== "owner" && orgRole !== "admin") {
    throw new ForbiddenError("Only owners and admins can remove members");
  }

  const [membership] = await db
    .select()
    .from(members)
    .where(and(eq(members.id, id), eq(members.organizationId, orgId)))
    .limit(1);

  if (!membership) {
    throw new NotFoundError("Member not found");
  }

  if (membership.role === "owner") {
    throw new ForbiddenError(
      "The owner cannot be removed from the organization"
    );
  }

  if (membership.userId === currentUser.id) {
    throw new ForbiddenError("You cannot remove yourself");
  }

  await db
    .delete(members)
    .where(and(eq(members.id, id), eq(members.organizationId, orgId)));

  void publishEvent(orgId, "member.removed", { id });
  void logAudit(db, {
    action: "member.removed",
    actorId: currentUser.id,
    metadata: { memberId: id, userId: membership.userId },
    orgId,
    resourceId: id,
    resourceType: "member"
  });
  return success(c, { success: true });
};
