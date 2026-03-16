import type { Database } from "@raven/db";
import { Hono } from "hono";
import type { Redis } from "ioredis";
import type { AppEnv } from "@/lib/types";
import { getCostBreakdown } from "./cost-attribution";
import { forecastCosts } from "./forecasting";

const toDateString = (date: Date): string =>
  date.toISOString().split("T")[0] ?? "";

const defaultStart = (): string =>
  toDateString(new Date(Date.now() - 30 * 86_400_000));

const defaultEnd = (): string => toDateString(new Date());

export const createFinOpsModule = (_db: Database, redis: Redis) => {
  const app = new Hono<AppEnv>();

  // Cost breakdown by tag
  app.get("/costs/breakdown", async (c) => {
    const orgId = c.get("orgId");
    const tagKey = c.req.query("tag") ?? "model";
    const startDate = c.req.query("start") ?? defaultStart();
    const endDate = c.req.query("end") ?? defaultEnd();
    const result = await getCostBreakdown(
      redis,
      orgId,
      tagKey,
      startDate,
      endDate
    );

    return c.json({ data: result });
  });

  // Cost forecast
  app.get("/costs/forecast", async (c) => {
    const orgId = c.get("orgId");
    const budgetMax = c.req.query("budget")
      ? Number(c.req.query("budget"))
      : undefined;
    const result = await forecastCosts(redis, orgId, budgetMax);

    return c.json({ data: result });
  });

  // Daily cost summary
  app.get("/costs/daily", async (c) => {
    const orgId = c.get("orgId");
    const days = Number(c.req.query("days") ?? "30");
    const now = new Date();
    const dailyCosts: Array<{ date: string; cost: number }> = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() - i);
      const dayKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
      const costKey = `finops:daily:${orgId}:${dayKey}`;
      const cost = await redis.get(costKey);
      dailyCosts.push({ cost: Number(cost ?? 0), date: dayKey });
    }

    return c.json({ data: dailyCosts });
  });

  // Model cost comparison
  app.get("/costs/models", async (c) => {
    const orgId = c.get("orgId");
    const startDate = c.req.query("start") ?? defaultStart();
    const endDate = c.req.query("end") ?? defaultEnd();
    const result = await getCostBreakdown(
      redis,
      orgId,
      "model",
      startDate,
      endDate
    );

    return c.json({ data: result });
  });

  // Provider cost comparison
  app.get("/costs/providers", async (c) => {
    const orgId = c.get("orgId");
    const startDate = c.req.query("start") ?? defaultStart();
    const endDate = c.req.query("end") ?? defaultEnd();
    const result = await getCostBreakdown(
      redis,
      orgId,
      "provider",
      startDate,
      endDate
    );

    return c.json({ data: result });
  });

  return app;
};
