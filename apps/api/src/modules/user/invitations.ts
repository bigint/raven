import { createId } from '@paralleldrive/cuid2'
import type { Database } from '@raven/db'
import { invitations, members, organizations } from '@raven/db'
import { and, eq } from 'drizzle-orm'
import type { Context } from 'hono'

export const listInvitations = (db: Database) => async (c: Context) => {
  const user = c.get('user' as never) as { id: string; email: string } | undefined
  if (!user) {
    return c.json({ code: 'UNAUTHORIZED', message: 'Not authenticated' }, 401)
  }

  const pending = await db
    .select({
      id: invitations.id,
      organizationId: invitations.organizationId,
      orgName: organizations.name,
      role: invitations.role,
      expiresAt: invitations.expiresAt,
    })
    .from(invitations)
    .innerJoin(organizations, eq(invitations.organizationId, organizations.id))
    .where(and(eq(invitations.email, user.email), eq(invitations.status, 'pending')))

  return c.json(pending)
}

export const acceptInvitation = (db: Database) => async (c: Context) => {
  const user = c.get('user' as never) as { id: string; email: string } | undefined
  if (!user) {
    return c.json({ code: 'UNAUTHORIZED', message: 'Not authenticated' }, 401)
  }

  const id = c.req.param('id') as string

  const [invitation] = await db
    .select()
    .from(invitations)
    .where(
      and(
        eq(invitations.id, id),
        eq(invitations.email, user.email),
        eq(invitations.status, 'pending'),
      ),
    )
    .limit(1)

  if (!invitation) {
    return c.json({ code: 'NOT_FOUND', message: 'Invitation not found' }, 404)
  }

  if (new Date() > invitation.expiresAt) {
    return c.json({ code: 'GONE', message: 'Invitation has expired' }, 410)
  }

  const memberId = createId()

  await db.transaction(async (tx) => {
    await tx.insert(members).values({
      id: memberId,
      organizationId: invitation.organizationId,
      userId: user.id,
      role: invitation.role,
    })
    await tx.update(invitations).set({ status: 'accepted' }).where(eq(invitations.id, id))
  })

  return c.json(
    {
      id: memberId,
      organizationId: invitation.organizationId,
      userId: user.id,
      role: invitation.role,
    },
    201,
  )
}

export const declineInvitation = (db: Database) => async (c: Context) => {
  const user = c.get('user' as never) as { id: string; email: string } | undefined
  if (!user) {
    return c.json({ code: 'UNAUTHORIZED', message: 'Not authenticated' }, 401)
  }

  const id = c.req.param('id') as string

  const [invitation] = await db
    .select()
    .from(invitations)
    .where(
      and(
        eq(invitations.id, id),
        eq(invitations.email, user.email),
        eq(invitations.status, 'pending'),
      ),
    )
    .limit(1)

  if (!invitation) {
    return c.json({ code: 'NOT_FOUND', message: 'Invitation not found' }, 404)
  }

  await db.update(invitations).set({ status: 'declined' }).where(eq(invitations.id, id))

  return c.json({ message: 'Invitation declined' })
}
