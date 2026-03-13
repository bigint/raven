import type { Database } from "@raven/db";
import { members, teamMembers, teams } from "@raven/db";
import { and, count, eq } from "drizzle-orm";
import type { z } from "zod";
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { publishEvent } from "@/lib/events";
import { created, success } from "@/lib/response";
import type { AppContext, AppContextWithJson } from "@/lib/types";
import { logAudit } from "@/modules/audit-logs/index";
import { checkFeatureGate } from "@/modules/proxy/plan-gate";
import type {
  addTeamMemberSchema,
  createTeamSchema,
  updateTeamSchema
} from "./schema";

export const listTeams = (db: Database) => async (c: AppContext) => {
  const orgId = c.get("orgId");

  const rows = await db
    .select({
      createdAt: teams.createdAt,
      id: teams.id,
      memberCount: count(teamMembers.id),
      name: teams.name
    })
    .from(teams)
    .leftJoin(teamMembers, eq(teams.id, teamMembers.teamId))
    .where(eq(teams.organizationId, orgId))
    .groupBy(teams.id, teams.name, teams.createdAt);

  return success(c, rows);
};

type CreateTeamBody = z.infer<typeof createTeamSchema>;

export const createTeam =
  (db: Database) => async (c: AppContextWithJson<CreateTeamBody>) => {
    const orgId = c.get("orgId");
    const orgRole = c.get("orgRole");
    const user = c.get("user");

    if (orgRole !== "owner" && orgRole !== "admin") {
      throw new ForbiddenError("Only owners and admins can create teams");
    }

    await checkFeatureGate(db, orgId, "hasTeams");

    const data = c.req.valid("json");

    const [record] = await db
      .insert(teams)
      .values({
        name: data.name,
        organizationId: orgId
      })
      .returning();

    const safe = record as NonNullable<typeof record>;
    void publishEvent(orgId, "team.created", safe);
    void logAudit(db, {
      action: "team.created",
      actorId: user.id,
      metadata: { name: data.name },
      orgId,
      resourceId: safe.id,
      resourceType: "team"
    });
    return created(c, safe);
  };

type UpdateTeamBody = z.infer<typeof updateTeamSchema>;

export const updateTeam =
  (db: Database) => async (c: AppContextWithJson<UpdateTeamBody>) => {
    const orgId = c.get("orgId");
    const orgRole = c.get("orgRole");
    const user = c.get("user");
    const id = c.req.param("id") as string;

    if (orgRole !== "owner" && orgRole !== "admin") {
      throw new ForbiddenError("Only owners and admins can update teams");
    }

    const data = c.req.valid("json");

    const [existing] = await db
      .select({ id: teams.id })
      .from(teams)
      .where(and(eq(teams.id, id), eq(teams.organizationId, orgId)))
      .limit(1);

    if (!existing) {
      throw new NotFoundError("Team not found");
    }

    const [updated] = await db
      .update(teams)
      .set({ name: data.name })
      .where(and(eq(teams.id, id), eq(teams.organizationId, orgId)))
      .returning();

    void publishEvent(orgId, "team.updated", updated);
    void logAudit(db, {
      action: "team.updated",
      actorId: user.id,
      metadata: { name: data.name },
      orgId,
      resourceId: id,
      resourceType: "team"
    });
    return success(c, updated);
  };

export const deleteTeam = (db: Database) => async (c: AppContext) => {
  const orgId = c.get("orgId");
  const orgRole = c.get("orgRole");
  const user = c.get("user");
  const id = c.req.param("id") as string;

  if (orgRole !== "owner" && orgRole !== "admin") {
    throw new ForbiddenError("Only owners and admins can delete teams");
  }

  const [existing] = await db
    .select({ id: teams.id })
    .from(teams)
    .where(and(eq(teams.id, id), eq(teams.organizationId, orgId)))
    .limit(1);

  if (!existing) {
    throw new NotFoundError("Team not found");
  }

  await db
    .delete(teams)
    .where(and(eq(teams.id, id), eq(teams.organizationId, orgId)));

  void publishEvent(orgId, "team.deleted", { id });
  void logAudit(db, {
    action: "team.deleted",
    actorId: user.id,
    orgId,
    resourceId: id,
    resourceType: "team"
  });
  return success(c, { success: true });
};

type AddTeamMemberBody = z.infer<typeof addTeamMemberSchema>;

export const addTeamMember =
  (db: Database) => async (c: AppContextWithJson<AddTeamMemberBody>) => {
    const orgId = c.get("orgId");
    const orgRole = c.get("orgRole");
    const user = c.get("user");
    const id = c.req.param("id") as string;

    if (orgRole !== "owner" && orgRole !== "admin") {
      throw new ForbiddenError("Only owners and admins can add team members");
    }

    const data = c.req.valid("json");

    const [team] = await db
      .select({ id: teams.id })
      .from(teams)
      .where(and(eq(teams.id, id), eq(teams.organizationId, orgId)))
      .limit(1);

    if (!team) {
      throw new NotFoundError("Team not found");
    }

    // Ensure user is an org member
    const [orgMembership] = await db
      .select({ id: members.id })
      .from(members)
      .where(
        and(eq(members.organizationId, orgId), eq(members.userId, data.userId))
      )
      .limit(1);

    if (!orgMembership) {
      throw new NotFoundError("User is not a member of this organization");
    }

    // Check for existing team membership
    const [existingTeamMember] = await db
      .select({ id: teamMembers.id })
      .from(teamMembers)
      .where(
        and(eq(teamMembers.teamId, id), eq(teamMembers.userId, data.userId))
      )
      .limit(1);

    if (existingTeamMember) {
      throw new ConflictError("User is already a member of this team");
    }

    const [record] = await db
      .insert(teamMembers)
      .values({
        role: data.role,
        teamId: id,
        userId: data.userId
      })
      .returning();

    void publishEvent(orgId, "team_member.added", {
      teamId: id,
      userId: data.userId
    });
    void logAudit(db, {
      action: "member.added",
      actorId: user.id,
      metadata: {
        role: data.role,
        teamId: id,
        userId: data.userId
      },
      orgId,
      resourceId: id,
      resourceType: "team"
    });
    return created(c, record);
  };

export const removeTeamMember = (db: Database) => async (c: AppContext) => {
  const orgId = c.get("orgId");
  const orgRole = c.get("orgRole");
  const user = c.get("user");
  const id = c.req.param("id") as string;
  const userId = c.req.param("userId") as string;

  if (orgRole !== "owner" && orgRole !== "admin") {
    throw new ForbiddenError("Only owners and admins can remove team members");
  }

  const [team] = await db
    .select({ id: teams.id })
    .from(teams)
    .where(and(eq(teams.id, id), eq(teams.organizationId, orgId)))
    .limit(1);

  if (!team) {
    throw new NotFoundError("Team not found");
  }

  const [existing] = await db
    .select({ id: teamMembers.id })
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, id), eq(teamMembers.userId, userId)))
    .limit(1);

  if (!existing) {
    throw new NotFoundError("Team member not found");
  }

  await db
    .delete(teamMembers)
    .where(and(eq(teamMembers.teamId, id), eq(teamMembers.userId, userId)));

  void publishEvent(orgId, "team_member.removed", { teamId: id, userId });
  void logAudit(db, {
    action: "member.removed",
    actorId: user.id,
    metadata: { teamId: id, userId },
    orgId,
    resourceId: id,
    resourceType: "team"
  });
  return success(c, { success: true });
};
