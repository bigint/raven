import { parseEnv } from '../packages/config/src/env.js'
import { createAuth } from '../packages/auth/src/server.js'
import { createDatabase } from '../packages/db/src/client.js'

const env = parseEnv()
const db = createDatabase(env.DATABASE_URL)
const auth = createAuth(db, env)

const SEED_USERS = [
  { name: 'Admin', email: 'admin@raven.dev', password: 'password123' },
  { name: 'Test User', email: 'user@raven.dev', password: 'password123' },
]

async function seed() {
  console.log('Seeding database...\n')

  for (const user of SEED_USERS) {
    try {
      const result = await auth.api.signUpEmail({ body: user })
      console.log(`Created: ${result.user.email}`)
    } catch (err: unknown) {
      const error = err as { statusCode?: number }
      if (error.statusCode === 422) {
        console.log(`Exists:  ${user.email} (skipped)`)
      } else {
        throw err
      }
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
