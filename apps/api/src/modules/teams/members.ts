import type { Database } from '@raven/db'
import { members, users } from '@raven/db'
import { and, eq } from 'drizzle-orm'
import type { Context } from 'hono'
import { z } from 'zod'
import { ForbiddenError, NotFoundError, ValidationError } from '../../lib/errors.js'
import { publishEvent } from '../../lib/events.js'

const changeRoleSchema = z.object({
  role: z.enum(['admin', 'member', 'viewer']),
})

export const listMembers = (db: Database) => async (c: Context) => {
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
}

export const removeMember = (db: Database) => async (c: Context) => {
  const orgId = c.get('orgId' as never) as string
  const orgRole = c.get('orgRole' as never) as string
  const currentUser = c.get('user' as never) as { id: string }
  const id = c.req.param('id') as string

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

  await db.delete(members).where(and(eq(members.id, id), eq(members.organizationId, orgId)))

  void publishEvent(orgId, 'member.removed', { id })
  return c.json({ success: true })
}

export const changeRole = (db: Database) => async (c: Context) => {
  const orgId = c.get('orgId' as never) as string
  const orgRole = c.get('orgRole' as never) as string
  const id = c.req.param('id') as string

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

  void publishEvent(orgId, 'member.role_changed', updated)
  return c.json(updated)
}
