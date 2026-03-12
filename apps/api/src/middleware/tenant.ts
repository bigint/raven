import type { Database } from '@raven/db'
import { members } from '@raven/db'
import { and, eq } from 'drizzle-orm'
import { createMiddleware } from 'hono/factory'

type TenantContext = {
  Variables: {
    orgId: string
    orgRole: string
  }
}

export const createTenantMiddleware = (db: Database) => {
  return createMiddleware<TenantContext>(async (c, next) => {
    const orgId = c.req.header('X-Org-Id')

    if (!orgId) {
      return c.json({ code: 'VALIDATION_ERROR', message: 'Organization ID required' }, 400)
    }

    const user = c.get('user' as never) as { id: string } | undefined

    if (!user) {
      return c.json({ code: 'UNAUTHORIZED', message: 'Not authenticated' }, 401)
    }

    const [membership] = await db
      .select()
      .from(members)
      .where(and(eq(members.organizationId, orgId), eq(members.userId, user.id)))
      .limit(1)

    if (!membership) {
      return c.json({ code: 'FORBIDDEN', message: 'Not a member of this organization' }, 403)
    }

    c.set('orgId', orgId)
    c.set('orgRole', membership.role)
    await next()
  })
}
