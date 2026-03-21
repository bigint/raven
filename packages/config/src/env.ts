import { z } from "zod";

const envSchema = z.object({
  API_PORT: z.coerce.number().default(3001),
  APP_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(16),
  BETTER_AUTH_URL: z.string().url(),
  DATABASE_URL: z.string().url(),
  ENCRYPTION_SECRET: z.string().min(32),
  ENCRYPTION_SECRET_PREVIOUS: z.string().min(32).optional(),
  NEXT_PUBLIC_API_URL: z.string().url(),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  REDIS_URL: z.string().url()
});

export type Env = z.infer<typeof envSchema>;

export const parseEnv = (
  source: Record<string, string | undefined> = process.env
): Env => {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const formatted = result.error.flatten().fieldErrors;
    const missing = Object.entries(formatted)
      .map(([key, errors]) => `  ${key}: ${errors?.join(", ")}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${missing}`);
  }
  return result.data;
};
