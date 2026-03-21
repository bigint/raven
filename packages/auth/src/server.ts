import type { Env } from "@raven/config";
import type { Database } from "@raven/db";
import * as schema from "@raven/db/schema";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { count, eq } from "drizzle-orm";

const SESSION_EXPIRY_SECONDS = 30 * 24 * 60 * 60; // 30 days
const SESSION_UPDATE_AGE_SECONDS = 24 * 60 * 60; // 1 day

interface AuthOptions {
  readonly onResetPassword?: (user: { email: string }, url: string) => void;
  readonly onUserCreated?: (user: {
    id: string;
    name: string;
    email: string;
  }) => void;
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
        session: schema.sessions,
        user: schema.users,
        verification: schema.verifications
      }
    }),
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            const [result] = await db
              .select({ value: count() })
              .from(schema.users);
            if (result?.value === 1) {
              await db
                .update(schema.users)
                .set({ role: "admin" })
                .where(eq(schema.users.id, user.id));
            }

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
    secret: env.BETTER_AUTH_SECRET,
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60
      },
      expiresIn: SESSION_EXPIRY_SECONDS,
      updateAge: SESSION_UPDATE_AGE_SECONDS
    },
    trustedOrigins: [env.APP_URL],
    user: {
      additionalFields: {
        avatarUrl: { required: false, type: "string" },
        role: { defaultValue: "viewer", type: "string" }
      }
    }
  });
};

export type Auth = ReturnType<typeof createAuth>;
