import { createAuth } from '../packages/auth/src/server.js'
import { parseEnv } from '../packages/config/src/env.js'
import { createDatabase } from '../packages/db/src/client.js'
import { members, organizations } from '../packages/db/src/schema/index.js'
import { createId } from '@paralleldrive/cuid2'
import { eq } from 'drizzle-orm'

const env = parseEnv()
const db = createDatabase(env.DATABASE_URL)
const auth = createAuth(db, env)

const SEED_USERS = [
  { name: 'Admin', email: 'admin@raven.dev', password: 'password123' },
  { name: 'Test User', email: 'user@raven.dev', password: 'password123' },
]

async function seed() {
  console.log('Seeding database...\n')

  const userIds: string[] = []

  for (const user of SEED_USERS) {
    try {
      const result = await auth.api.signUpEmail({ body: user })
      console.log(`Created: ${result.user.email}`)
      userIds.push(result.user.id)
    } catch (err: unknown) {
      const error = err as { status?: number; statusCode?: number }
      if (error.status === 422 || error.statusCode === 422) {
        console.log(`Exists:  ${user.email} (skipped)`)
        const signInResult = await auth.api.signInEmail({
          body: { email: user.email, password: user.password },
        })
        if (signInResult.user?.id) {
          userIds.push(signInResult.user.id)
        }
      } else {
        throw err
      }
    }
  }

  // Create default organization directly in DB
  const [existingOrg] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, 'default'))
    .limit(1)

  let orgId: string

  if (existingOrg) {
    orgId = existingOrg.id
    console.log(`\nOrg exists: ${existingOrg.name} (${orgId})`)
  } else {
    orgId = createId()
    await db.insert(organizations).values({
      id: orgId,
      name: 'Default Organization',
      slug: 'default',
    })
    console.log(`\nCreated org: Default Organization (${orgId})`)
  }

  // Add users as members
  for (let i = 0; i < userIds.length; i++) {
    const userId = userIds[i]
    if (!userId) continue
    const role: 'owner' | 'member' = i === 0 ? 'owner' : 'member'

    const [existing] = await db
      .select()
      .from(members)
      .where(eq(members.userId, userId))
      .limit(1)

    if (!existing) {
      await db.insert(members).values({
        id: createId(),
        organizationId: orgId,
        userId,
        role,
      })
      console.log(`Added ${SEED_USERS[i].email} as ${role}`)
    } else {
      console.log(`Member: ${SEED_USERS[i].email} already in org`)
    }
  }

  console.log('\nSeed complete! Sign in with:')
  console.log('  Admin: admin@raven.dev / password123')
  console.log('  User:  user@raven.dev / password123')

  process.exit(0)
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
