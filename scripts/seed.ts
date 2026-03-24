import { eq } from 'drizzle-orm'
import { createAuth } from '../packages/auth/src/server'
import { parseEnv } from '../packages/config/src/env'
import { createDatabase } from '../packages/db/src/client'
import { settings, users } from '../packages/db/src/schema/index'

const env = parseEnv()
const db = createDatabase(env.DATABASE_URL)
const auth = createAuth(db, env)

const SEED_USERS = [
  { name: 'Admin', email: 'yoginth+admin@hey.com', password: 'password123', role: 'admin' as const },
  { name: 'Member', email: 'yoginth+member@hey.com', password: 'password123', role: 'member' as const },
  { name: 'Viewer', email: 'yoginth+viewer@hey.com', password: 'password123', role: 'viewer' as const },
]

const DEFAULT_SETTINGS = [
  { key: 'analytics_retention_days', value: '365' },
]

async function seed() {
  console.log('Seeding database...\n')

  // Create users
  for (const user of SEED_USERS) {
    try {
      const result = await auth.api.signUpEmail({
        body: { name: user.name, email: user.email, password: user.password },
      })
      console.log(`Created: ${result.user.email}`)

      // Set role
      await db
        .update(users)
        .set({ role: user.role })
        .where(eq(users.id, result.user.id))
      console.log(`  Role set to ${user.role}`)
    } catch (err: unknown) {
      const error = err as { status?: number; statusCode?: number }
      if (error.status === 422 || error.statusCode === 422) {
        console.log(`Exists:  ${user.email} (skipped)`)
      } else {
        throw err
      }
    }
  }

  // Insert default settings
  console.log('\nSettings:')
  for (const setting of DEFAULT_SETTINGS) {
    await db
      .insert(settings)
      .values(setting)
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: setting.value, updatedAt: new Date() },
      })
    console.log(`  ${setting.key} = ${setting.value}`)
  }

  console.log('\n---')
  console.log('Seed complete! Sign in with:')
  console.log('  Admin:  yoginth+admin@hey.com / password123')
  console.log('  Member: yoginth+member@hey.com / password123')
  console.log('  Viewer: yoginth+viewer@hey.com / password123')

  process.exit(0)
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
