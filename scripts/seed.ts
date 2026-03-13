import { createId } from '@paralleldrive/cuid2'
import { and, eq } from 'drizzle-orm'
import { createAuth } from '../packages/auth/src/server'
import { parseEnv } from '../packages/config/src/env'
import { createDatabase } from '../packages/db/src/client'
import { members, organizations, subscriptions } from '../packages/db/src/schema/index'

const env = parseEnv()
const db = createDatabase(env.DATABASE_URL)
const auth = createAuth(db, env)

const SEED_USERS = [
  { name: 'Admin', email: 'admin@raven.dev', password: 'password123' },
  { name: 'Test User', email: 'user@raven.dev', password: 'password123' },
]

const SEED_ORGS = [
  { name: 'Free Org', slug: 'free-org', plan: 'free' as const },
  { name: 'Pro Org', slug: 'pro-org', plan: 'pro' as const },
  { name: 'Team Org', slug: 'team-org', plan: 'team' as const },
  { name: 'Enterprise Org', slug: 'enterprise-org', plan: 'enterprise' as const },
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

  // Create one org per plan
  const now = new Date()
  const periodEnd = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000) // 1 year from now

  for (const orgDef of SEED_ORGS) {
    const [existingOrg] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, orgDef.slug))
      .limit(1)

    let orgId: string

    if (existingOrg) {
      orgId = existingOrg.id
      console.log(`\nOrg exists: ${existingOrg.name} (${orgId})`)
    } else {
      orgId = createId()
      await db.insert(organizations).values({
        id: orgId,
        name: orgDef.name,
        slug: orgDef.slug,
      })
      console.log(`\nCreated org: ${orgDef.name} (${orgId})`)
    }

    // Upsert subscription
    const [existingSub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, orgId))
      .limit(1)

    if (existingSub) {
      await db
        .update(subscriptions)
        .set({ plan: orgDef.plan, status: 'active', updatedAt: now })
        .where(eq(subscriptions.id, existingSub.id))
      console.log(`  Subscription updated to ${orgDef.plan}`)
    } else {
      await db.insert(subscriptions).values({
        id: createId(),
        organizationId: orgId,
        lemonSqueezySubscriptionId: `seed_${orgDef.slug}_${createId()}`,
        plan: orgDef.plan,
        status: 'active',
        seats: orgDef.plan === 'enterprise' ? 100 : orgDef.plan === 'team' ? 25 : 5,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      })
      console.log(`  Subscription created: ${orgDef.plan}`)
    }

    // Add both users as members (admin = owner, test user = member)
    for (let i = 0; i < userIds.length; i++) {
      const userId = userIds[i]
      if (!userId) continue
      const role: 'owner' | 'member' = i === 0 ? 'owner' : 'member'

      const [existing] = await db
        .select()
        .from(members)
        .where(and(eq(members.userId, userId), eq(members.organizationId, orgId)))
        .limit(1)

      if (!existing) {
        await db.insert(members).values({
          id: createId(),
          organizationId: orgId,
          userId,
          role,
        })
        console.log(`  Added ${SEED_USERS[i]?.email} as ${role}`)
      } else {
        console.log(`  Member: ${SEED_USERS[i]?.email} already in org`)
      }
    }
  }

  console.log('\n---')
  console.log('Seed complete! Sign in with:')
  console.log('  Admin: admin@raven.dev / password123')
  console.log('  User:  user@raven.dev / password123')
  console.log('\nOrganizations:')
  console.log('  free-org        → Free plan')
  console.log('  pro-org         → Pro plan')
  console.log('  team-org        → Team plan')
  console.log('  enterprise-org  → Enterprise plan (default)')

  process.exit(0)
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
