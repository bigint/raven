import type { Env } from "@raven/config";
import type { Database } from "@raven/db";
import * as schema from "@raven/db/schema";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";

export const createAuth = (db: Database, env: Env) => {
  return betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        ...schema,
        account: schema.accounts,
        invitation: schema.invitations,
        member: schema.members,
        organization: schema.organizations,
        session: schema.sessions,
        user: schema.users,
        verification: schema.verifications
      }
    }),
    emailAndPassword: {
      enabled: true
    },
    plugins: [organization()],
    secret: env.BETTER_AUTH_SECRET,
    session: {
      expiresIn: 30 * 24 * 60 * 60,
      updateAge: 24 * 60 * 60
    },
    socialProviders: {
      ...(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
        ? {
            github: {
              clientId: env.GITHUB_CLIENT_ID,
              clientSecret: env.GITHUB_CLIENT_SECRET
            }
          }
        : {}),
      ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
        ? {
            google: {
              clientId: env.GOOGLE_CLIENT_ID,
              clientSecret: env.GOOGLE_CLIENT_SECRET
            }
          }
        : {})
    },
    trustedOrigins: [env.APP_URL],
    user: {
      additionalFields: {
        avatarUrl: { required: false, type: "string" },
        role: { defaultValue: "user", type: "string" }
      }
    }
  });
};

export type Auth = ReturnType<typeof createAuth>;
