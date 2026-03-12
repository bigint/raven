import { createId } from '@paralleldrive/cuid2'
import type { Database } from '@raven/db'
import { invitations, members, organizations, users } from '@raven/db'
import { and, eq } from 'drizzle-orm'
import { Hono } from 'hono'

export const createUserModule = (db: Database) => {
  const app = new Hono()

  // Update user profile
  app.put('/profile', async (c) => {
    const user = c.get('user' as never) as
      | { id: string; email: string }
      | undefined
    if (!user) {
      return c.json(
        { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        401
      )
    }

    const body = await c.req.json<{ name: string }>()
    const name = body.name?.trim()
    if (!name) {
      return c.json(
        { code: 'VALIDATION_ERROR', message: 'Name is required' },
        400
      )
    }

    const [updated] = await db
      .update(users)
      .set({ name, updatedAt: new Date() })
      .where(eq(users.id, user.id))
      .returning()

    return c.json(updated)
  })

  // List pending invitations for the authenticated user
  app.get('/invitations', async (c) => {
    const user = c.get('user' as never) as
      | { id: string; email: string }
      | undefined
    if (!user) {
      return c.json(
        { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        401
      )
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
      .innerJoin(
        organizations,
        eq(invitations.organizationId, organizations.id)
      )
      .where(
        and(
          eq(invitations.email, user.email),
          eq(invitations.status, 'pending')
        )
      )

    return c.json(pending)
  })

  // Accept an invitation
  app.post('/invitations/:id/accept', async (c) => {
    const user = c.get('user' as never) as
      | { id: string; email: string }
      | undefined
    if (!user) {
      return c.json(
        { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        401
      )
    }

    const id = c.req.param('id')

    const [invitation] = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.id, id),
          eq(invitations.email, user.email),
          eq(invitations.status, 'pending')
        )
      )
      .limit(1)

    if (!invitation) {
      return c.json(
        { code: 'NOT_FOUND', message: 'Invitation not found' },
        404
      )
    }

    if (new Date() > invitation.expiresAt) {
      return c.json(
        { code: 'GONE', message: 'Invitation has expired' },
        410
      )
    }

    const memberId = createId()

    await db.transaction(async (tx) => {
      await tx.insert(members).values({
        id: memberId,
        organizationId: invitation.organizationId,
        userId: user.id,
        role: invitation.role,
      })
      await tx
        .update(invitations)
        .set({ status: 'accepted' })
        .where(eq(invitations.id, id))
    })

    return c.json(
      {
        id: memberId,
        organizationId: invitation.organizationId,
        userId: user.id,
        role: invitation.role,
      },
      201
    )
  })

  // Decline an invitation
  app.post('/invitations/:id/decline', async (c) => {
    const user = c.get('user' as never) as
      | { id: string; email: string }
      | undefined
    if (!user) {
      return c.json(
        { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        401
      )
    }

    const id = c.req.param('id')

    const [invitation] = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.id, id),
          eq(invitations.email, user.email),
          eq(invitations.status, 'pending')
        )
      )
      .limit(1)

    if (!invitation) {
      return c.json(
        { code: 'NOT_FOUND', message: 'Invitation not found' },
        404
      )
    }

    await db
      .update(invitations)
      .set({ status: 'declined' })
      .where(eq(invitations.id, id))

    return c.json({ message: 'Invitation declined' })
  })

  // Get organizations the current user belongs to
  app.get('/orgs', async (c) => {
    const user = c.get('user' as never) as { id: string } | undefined
    if (!user) {
      return c.json(
        { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        401
      )
    }

    const userMembers = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        role: members.role,
      })
      .from(members)
      .innerJoin(organizations, eq(members.organizationId, organizations.id))
      .where(eq(members.userId, user.id))

    return c.json(userMembers)
  })

  // Create a new organization for the current user
  app.post('/orgs', async (c) => {
    const user = c.get('user' as never) as { id: string } | undefined
    if (!user) {
      return c.json(
        { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        401
      )
    }

    const body = await c.req.json<{ name: string; slug?: string }>()
    const name = body.name?.trim()
    if (!name) {
      return c.json(
        {
          code: 'VALIDATION_ERROR',
          message: 'Organization name is required',
        },
        400
      )
    }

    const slug = body.slug?.trim() || `org-${createId()}`
    const orgId = createId()

    await db.transaction(async (tx) => {
      await tx.insert(organizations).values({ id: orgId, name, slug })
      await tx.insert(members).values({
        id: createId(),
        organizationId: orgId,
        userId: user.id,
        role: 'owner',
      })
    })

    return c.json({ id: orgId, name, slug, role: 'owner' }, 201)
  })

  return app
}
