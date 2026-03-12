import type { Database } from '@raven/db'
import { members, teamMembers, teams } from '@raven/db'
import { and, count, eq } from 'drizzle-orm'
import type { Context } from 'hono'
import { z } from 'zod'
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../lib/errors.js'
import { publishEvent } from '../../lib/events.js'

const createTeamSchema = z.object({
  name: z.string().min(1).max(100),
})

const updateTeamSchema = z.object({
  name: z.string().min(1).max(100),
})

const addTeamMemberSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['lead', 'member']).default('member'),
})

export const listTeams = (db: Database) => async (c: Context) => {
  const orgId = c.get('orgId' as never) as string

  const rows = await db
    .select({
      id: teams.id,
      name: teams.name,
      createdAt: teams.createdAt,
      memberCount: count(teamMembers.id),
    })
    .from(teams)
    .leftJoin(teamMembers, eq(teams.id, teamMembers.teamId))
    .where(eq(teams.organizationId, orgId))
    .groupBy(teams.id, teams.name, teams.createdAt)

  return c.json(rows)
}

export const createTeam = (db: Database) => async (c: Context) => {
  const orgId = c.get('orgId' as never) as string
  const orgRole = c.get('orgRole' as never) as string

  if (orgRole !== 'owner' && orgRole !== 'admin') {
    throw new ForbiddenError('Only owners and admins can create teams')
  }

  const body = await c.req.json()
  const result = createTeamSchema.safeParse(body)

  if (!result.success) {
    throw new ValidationError('Invalid request body', {
      errors: result.error.flatten().fieldErrors,
    })
  }

  const [created] = await db
    .insert(teams)
    .values({
      organizationId: orgId,
      name: result.data.name,
    })
    .returning()

  void publishEvent(orgId, 'team.created', created)
  return c.json(created, 201)
}

export const updateTeam = (db: Database) => async (c: Context) => {
  const orgId = c.get('orgId' as never) as string
  const orgRole = c.get('orgRole' as never) as string
  const id = c.req.param('id') as string

  if (orgRole !== 'owner' && orgRole !== 'admin') {
    throw new ForbiddenError('Only owners and admins can update teams')
  }

  const body = await c.req.json()
  const result = updateTeamSchema.safeParse(body)

  if (!result.success) {
    throw new ValidationError('Invalid request body', {
      errors: result.error.flatten().fieldErrors,
    })
  }

  const [existing] = await db
    .select({ id: teams.id })
    .from(teams)
    .where(and(eq(teams.id, id), eq(teams.organizationId, orgId)))
    .limit(1)

  if (!existing) {
    throw new NotFoundError('Team not found')
  }

  const [updated] = await db
    .update(teams)
    .set({ name: result.data.name })
    .where(and(eq(teams.id, id), eq(teams.organizationId, orgId)))
    .returning()

  void publishEvent(orgId, 'team.updated', updated)
  return c.json(updated)
}

export const deleteTeam = (db: Database) => async (c: Context) => {
  const orgId = c.get('orgId' as never) as string
  const orgRole = c.get('orgRole' as never) as string
  const id = c.req.param('id') as string

  if (orgRole !== 'owner' && orgRole !== 'admin') {
    throw new ForbiddenError('Only owners and admins can delete teams')
  }

  const [existing] = await db
    .select({ id: teams.id })
    .from(teams)
    .where(and(eq(teams.id, id), eq(teams.organizationId, orgId)))
    .limit(1)

  if (!existing) {
    throw new NotFoundError('Team not found')
  }

  await db.delete(teams).where(and(eq(teams.id, id), eq(teams.organizationId, orgId)))

  void publishEvent(orgId, 'team.deleted', { id })
  return c.json({ success: true })
}

export const addTeamMember = (db: Database) => async (c: Context) => {
  const orgId = c.get('orgId' as never) as string
  const orgRole = c.get('orgRole' as never) as string
  const id = c.req.param('id') as string

  if (orgRole !== 'owner' && orgRole !== 'admin') {
    throw new ForbiddenError('Only owners and admins can add team members')
  }

  const body = await c.req.json()
  const result = addTeamMemberSchema.safeParse(body)

  if (!result.success) {
    throw new ValidationError('Invalid request body', {
      errors: result.error.flatten().fieldErrors,
    })
  }

  const [team] = await db
    .select({ id: teams.id })
    .from(teams)
    .where(and(eq(teams.id, id), eq(teams.organizationId, orgId)))
    .limit(1)

  if (!team) {
    throw new NotFoundError('Team not found')
  }

  // Ensure user is an org member
  const [orgMembership] = await db
    .select({ id: members.id })
    .from(members)
    .where(and(eq(members.organizationId, orgId), eq(members.userId, result.data.userId)))
    .limit(1)

  if (!orgMembership) {
    throw new NotFoundError('User is not a member of this organization')
  }

  // Check for existing team membership
  const [existingTeamMember] = await db
    .select({ id: teamMembers.id })
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, id), eq(teamMembers.userId, result.data.userId)))
    .limit(1)

  if (existingTeamMember) {
    throw new ConflictError('User is already a member of this team')
  }

  const [created] = await db
    .insert(teamMembers)
    .values({
      teamId: id,
      userId: result.data.userId,
      role: result.data.role,
    })
    .returning()

  void publishEvent(orgId, 'team_member.added', { teamId: id, userId: result.data.userId })
  return c.json(created, 201)
}

export const removeTeamMember = (db: Database) => async (c: Context) => {
  const orgId = c.get('orgId' as never) as string
  const orgRole = c.get('orgRole' as never) as string
  const id = c.req.param('id') as string
  const userId = c.req.param('userId') as string

  if (orgRole !== 'owner' && orgRole !== 'admin') {
    throw new ForbiddenError('Only owners and admins can remove team members')
  }

  const [team] = await db
    .select({ id: teams.id })
    .from(teams)
    .where(and(eq(teams.id, id), eq(teams.organizationId, orgId)))
    .limit(1)

  if (!team) {
    throw new NotFoundError('Team not found')
  }

  const [existing] = await db
    .select({ id: teamMembers.id })
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, id), eq(teamMembers.userId, userId)))
    .limit(1)

  if (!existing) {
    throw new NotFoundError('Team member not found')
  }

  await db
    .delete(teamMembers)
    .where(and(eq(teamMembers.teamId, id), eq(teamMembers.userId, userId)))

  void publishEvent(orgId, 'team_member.removed', { teamId: id, userId })
  return c.json({ success: true })
}
