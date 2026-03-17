import type { Env } from "@raven/config";
import type { Database } from "@raven/db";
import * as schema from "@raven/db/schema";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";

interface AuthOptions {
  onResetPassword?: (user: { email: string }, url: string) => void;
  onUserCreated?: (user: { id: string; name: string; email: string }) => void;
}

export const createAuth = (db: Database, env: Env, options?: AuthOptions) => {
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
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            if (options?.onUserCreated) {
              options.onUserCreated({
                email: user.email,
                id: user.id,
                name: user.name
              });
            }
          }
        }
      }
    },
    emailAndPassword: {
      enabled: true,
      sendResetPassword: options?.onResetPassword
        ? async ({ url, user }) => {
            options.onResetPassword?.(user, url);
          }
        : undefined
    },
    ...(env.NODE_ENV === "production"
      ? {
          advanced: {
            defaultCookieAttributes: {
              sameSite: "none" as const,
              secure: true
            }
          }
        }
      : {}),
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
