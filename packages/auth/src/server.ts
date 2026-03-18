import type { Env } from "@raven/config";
import type { Database } from "@raven/db";
import * as schema from "@raven/db/schema";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";

const SESSION_EXPIRY_SECONDS = 30 * 24 * 60 * 60; // 30 days
const SESSION_UPDATE_AGE_SECONDS = 24 * 60 * 60; // 1 day

interface AuthOptions {
  readonly onResetPassword?: (user: { email: string }, url: string) => void;
  readonly onUserCreated?: (user: { id: string; name: string; email: string }) => void;
}

export const createAuth = (db: Database, env: Env, options?: AuthOptions) => {
  return betterAuth({
    advanced: {
      defaultCookieAttributes: {
        httpOnly: true,
        path: "/",
        ...(env.NODE_ENV === "production"
          ? { sameSite: "none" as const, secure: true }
          : { sameSite: "lax" as const, secure: false })
      }
    },
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
    plugins: [organization()],
    secret: env.BETTER_AUTH_SECRET,
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60
      },
      expiresIn: SESSION_EXPIRY_SECONDS,
      updateAge: SESSION_UPDATE_AGE_SECONDS
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
