import type { Context } from "hono";

export const success = <T>(c: Context, data: T, status: 200 | 201 = 200) =>
  c.json({ data }, status);

export const created = <T>(c: Context, data: T) => c.json({ data }, 201);
