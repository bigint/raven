import type { Database } from '@raven/db'
import { organizations } from '@raven/db'
import { eq } from 'drizzle-orm'
import type { Context } from 'hono'
import { ForbiddenError } from '../../lib/errors.js'

export const deleteSettings = (db: Database) => async (c: Context) => {
  const orgId = c.get('orgId' as never) as string
  const orgRole = c.get('orgRole' as never) as string

  if (orgRole !== 'owner') {
    throw new ForbiddenError('Only the owner can delete the organization')
  }

  await db.delete(organizations).where(eq(organizations.id, orgId))

  return c.json({ success: true })
}
