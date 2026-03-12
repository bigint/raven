import { createId } from '@paralleldrive/cuid2'
import type { Database } from '@raven/db'
import { members, organizations } from '@raven/db'
import { eq } from 'drizzle-orm'
import type { Context } from 'hono'

export const listOrgs = (db: Database) => async (c: Context) => {
  const user = c.get('user' as never) as { id: string } | undefined
  if (!user) {
    return c.json({ code: 'UNAUTHORIZED', message: 'Not authenticated' }, 401)
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
}

export const createOrg = (db: Database) => async (c: Context) => {
  const user = c.get('user' as never) as { id: string } | undefined
  if (!user) {
    return c.json({ code: 'UNAUTHORIZED', message: 'Not authenticated' }, 401)
  }

  const body = await c.req.json<{ name: string; slug?: string }>()
  const name = body.name?.trim()
  if (!name) {
    return c.json(
      {
        code: 'VALIDATION_ERROR',
        message: 'Organization name is required',
      },
      400,
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
}
