import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { organization } from 'better-auth/plugins'
import type { Database } from '@raven/db'
import type { Env } from '@raven/config'

export const createAuth = (db: Database, env: Env) => {
  return betterAuth({
    database: drizzleAdapter(db, { provider: 'pg' }),
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins: [env.APP_URL],
    emailAndPassword: {
      enabled: true,
    },
    user: {
      additionalFields: {
        role: { type: 'string', defaultValue: 'user' },
        avatarUrl: { type: 'string', required: false },
      },
    },
    socialProviders: {
      ...(env.GITHUB_CLIENT_ID
        ? {
            github: {
              clientId: env.GITHUB_CLIENT_ID,
              clientSecret: env.GITHUB_CLIENT_SECRET!,
            },
          }
        : {}),
      ...(env.GOOGLE_CLIENT_ID
        ? {
            google: {
              clientId: env.GOOGLE_CLIENT_ID,
              clientSecret: env.GOOGLE_CLIENT_SECRET!,
            },
          }
        : {}),
    },
    session: {
      expiresIn: 30 * 24 * 60 * 60,
      updateAge: 24 * 60 * 60,
    },
    plugins: [organization()],
  })
}

export type Auth = ReturnType<typeof createAuth>
