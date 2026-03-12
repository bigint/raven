import type { Database } from '@raven/db'
import { invitations, members, teamMembers, teams, users } from '@raven/db'
import { and, count, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../lib/errors.js'

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member', 'viewer']).default('member'),
})

const changeRoleSchema = z.object({
  role: z.enum(['admin', 'member', 'viewer']),
})

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

export const createTeamsModule = (db: Database) => {
  const app = new Hono()

  // GET /members — List org members with roles
  app.get('/members', async (c) => {
    const orgId = c.get('orgId' as never) as string

    const rows = await db
      .select({
        id: members.id,
        userId: members.userId,
        role: members.role,
        createdAt: members.createdAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(members)
      .innerJoin(users, eq(members.userId, users.id))
      .where(eq(members.organizationId, orgId))

    return c.json(
      rows.map((r) => ({
        id: r.id,
        userId: r.userId,
        name: r.userName,
        email: r.userEmail,
        role: r.role,
        joinedAt: r.createdAt,
      })),
    )
  })

  // POST /invitations — Invite a user by email
  app.post('/invitations', async (c) => {
    const orgId = c.get('orgId' as never) as string
    const orgRole = c.get('orgRole' as never) as string

    if (orgRole !== 'owner' && orgRole !== 'admin') {
      throw new ForbiddenError('Only owners and admins can invite members')
    }

    const body = await c.req.json()
    const result = inviteSchema.safeParse(body)

    if (!result.success) {
      throw new ValidationError('Invalid request body', {
        errors: result.error.flatten().fieldErrors,
      })
    }

    const { email, role } = result.data

    // Check if user is already a member
    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (existingUser) {
      const [existingMember] = await db
        .select({ id: members.id })
        .from(members)
        .where(and(eq(members.organizationId, orgId), eq(members.userId, existingUser.id)))
        .limit(1)

      if (existingMember) {
        throw new ConflictError('User is already a member of this organization')
      }
    }

    // Check for existing pending invitation
    const [existingInvitation] = await db
      .select({ id: invitations.id })
      .from(invitations)
      .where(and(eq(invitations.organizationId, orgId), eq(invitations.email, email)))
      .limit(1)

    if (existingInvitation) {
      throw new ConflictError('An invitation for this email already exists')
    }

    const currentUser = c.get('user' as never) as { id: string }
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const [created] = await db
      .insert(invitations)
      .values({
        organizationId: orgId,
        email,
        role,
        inviterId: currentUser.id,
        expiresAt,
      })
      .returning()

    return c.json(created, 201)
  })

  // GET /invitations — List org invitations
  app.get('/invitations', async (c) => {
    const orgId = c.get('orgId' as never) as string

    const rows = await db
      .select()
      .from(invitations)
      .where(eq(invitations.organizationId, orgId))

    return c.json(rows)
  })

  // DELETE /invitations/:id — Revoke an invitation
  app.delete('/invitations/:id', async (c) => {
    const orgId = c.get('orgId' as never) as string
    const orgRole = c.get('orgRole' as never) as string
    const id = c.req.param('id')

    if (orgRole !== 'owner' && orgRole !== 'admin') {
      throw new ForbiddenError('Only owners and admins can revoke invitations')
    }

    const [existing] = await db
      .select({ id: invitations.id })
      .from(invitations)
      .where(and(eq(invitations.id, id), eq(invitations.organizationId, orgId)))
      .limit(1)

    if (!existing) {
      throw new NotFoundError('Invitation not found')
    }

    await db
      .delete(invitations)
      .where(and(eq(invitations.id, id), eq(invitations.organizationId, orgId)))

    return c.json({ success: true })
  })

  // DELETE /members/:id — Remove a member from org
  app.delete('/members/:id', async (c) => {
    const orgId = c.get('orgId' as never) as string
    const orgRole = c.get('orgRole' as never) as string
    const currentUser = c.get('user' as never) as { id: string }
    const id = c.req.param('id')

    if (orgRole !== 'owner' && orgRole !== 'admin') {
      throw new ForbiddenError('Only owners and admins can remove members')
    }

    const [membership] = await db
      .select()
      .from(members)
      .where(and(eq(members.id, id), eq(members.organizationId, orgId)))
      .limit(1)

    if (!membership) {
      throw new NotFoundError('Member not found')
    }

    if (membership.role === 'owner') {
      throw new ForbiddenError('The owner cannot be removed from the organization')
    }

    if (membership.userId === currentUser.id) {
      throw new ForbiddenError('You cannot remove yourself')
    }

    await db
      .delete(members)
      .where(and(eq(members.id, id), eq(members.organizationId, orgId)))

    return c.json({ success: true })
  })

  // PUT /members/:id/role — Change member role
  app.put('/members/:id/role', async (c) => {
    const orgId = c.get('orgId' as never) as string
    const orgRole = c.get('orgRole' as never) as string
    const id = c.req.param('id')

    if (orgRole !== 'owner' && orgRole !== 'admin') {
      throw new ForbiddenError('Only owners and admins can change member roles')
    }

    const body = await c.req.json()
    const result = changeRoleSchema.safeParse(body)

    if (!result.success) {
      throw new ValidationError('Invalid request body', {
        errors: result.error.flatten().fieldErrors,
      })
    }

    const [membership] = await db
      .select()
      .from(members)
      .where(and(eq(members.id, id), eq(members.organizationId, orgId)))
      .limit(1)

    if (!membership) {
      throw new NotFoundError('Member not found')
    }

    if (membership.role === 'owner') {
      throw new ForbiddenError('Cannot change the role of the organization owner')
    }

    const [updated] = await db
      .update(members)
      .set({ role: result.data.role })
      .where(and(eq(members.id, id), eq(members.organizationId, orgId)))
      .returning()

    return c.json(updated)
  })

  // GET /teams — List teams in org with member counts
  app.get('/teams', async (c) => {
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
  })

  // POST /teams — Create team
  app.post('/teams', async (c) => {
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

    return c.json(created, 201)
  })

  // PUT /teams/:id — Update team name
  app.put('/teams/:id', async (c) => {
    const orgId = c.get('orgId' as never) as string
    const orgRole = c.get('orgRole' as never) as string
    const id = c.req.param('id')

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

    return c.json(updated)
  })

  // DELETE /teams/:id — Delete team
  app.delete('/teams/:id', async (c) => {
    const orgId = c.get('orgId' as never) as string
    const orgRole = c.get('orgRole' as never) as string
    const id = c.req.param('id')

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

    return c.json({ success: true })
  })

  // POST /teams/:id/members — Add member to team
  app.post('/teams/:id/members', async (c) => {
    const orgId = c.get('orgId' as never) as string
    const orgRole = c.get('orgRole' as never) as string
    const id = c.req.param('id')

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

    return c.json(created, 201)
  })

  // DELETE /teams/:id/members/:userId — Remove member from team
  app.delete('/teams/:id/members/:userId', async (c) => {
    const orgId = c.get('orgId' as never) as string
    const orgRole = c.get('orgRole' as never) as string
    const id = c.req.param('id')
    const userId = c.req.param('userId')

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

    return c.json({ success: true })
  })

  return app
}
