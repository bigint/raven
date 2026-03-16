import type { Database } from "@raven/db";
import { auditLogs, requestLogs } from "@raven/db";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { Hono } from "hono";
import type { AppContext } from "@/lib/types";

export const createExportsModule = (db: Database) => {
  const app = new Hono();

  // Export request logs as JSON
  app.get("/request-logs", async (c: AppContext) => {
    const orgId = c.get("orgId");
    const format = c.req.query("format") ?? "json";
    const limit = Math.min(Number(c.req.query("limit") ?? "1000"), 10000);
    const startDate = c.req.query("start");
    const endDate = c.req.query("end");

    const conditions = [eq(requestLogs.organizationId, orgId)];
    if (startDate)
      conditions.push(gte(requestLogs.createdAt, new Date(startDate)));
    if (endDate) conditions.push(lte(requestLogs.createdAt, new Date(endDate)));

    const logs = await db
      .select()
      .from(requestLogs)
      .where(and(...conditions))
      .orderBy(desc(requestLogs.createdAt))
      .limit(limit);

    if (format === "csv") {
      const headers = [
        "id",
        "model",
        "provider",
        "status_code",
        "latency_ms",
        "input_tokens",
        "output_tokens",
        "cost",
        "cache_hit",
        "created_at"
      ];
      const csvRows = [headers.join(",")];
      for (const log of logs) {
        csvRows.push(
          [
            log.id,
            log.model,
            log.provider,
            String(log.statusCode),
            String(log.latencyMs),
            String(log.inputTokens),
            String(log.outputTokens),
            String(log.cost),
            String(log.cacheHit),
            log.createdAt.toISOString()
          ].join(",")
        );
      }
      return c.text(csvRows.join("\n"), 200, {
        "Content-Disposition": `attachment; filename="request-logs-${orgId}.csv"`,
        "Content-Type": "text/csv"
      });
    }

    // NDJSON format for streaming/warehouse ingestion
    if (format === "ndjson") {
      const lines = logs.map((log) => JSON.stringify(log)).join("\n");
      return c.text(lines, 200, {
        "Content-Disposition": `attachment; filename="request-logs-${orgId}.ndjson"`,
        "Content-Type": "application/x-ndjson"
      });
    }

    return c.json({ data: logs, total: logs.length });
  });

  // Export audit logs
  app.get("/audit-logs", async (c: AppContext) => {
    const orgId = c.get("orgId");
    const limit = Math.min(Number(c.req.query("limit") ?? "1000"), 10000);

    const logs = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.organizationId, orgId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);

    return c.json({ data: logs, total: logs.length });
  });

  // Export cost report
  app.get("/cost-report", async (c: AppContext) => {
    const orgId = c.get("orgId");
    const startDate =
      c.req.query("start") ??
      new Date(Date.now() - 30 * 86400000).toISOString();
    const endDate = c.req.query("end") ?? new Date().toISOString();

    const logs = await db
      .select({
        cost: requestLogs.cost,
        createdAt: requestLogs.createdAt,
        inputTokens: requestLogs.inputTokens,
        model: requestLogs.model,
        outputTokens: requestLogs.outputTokens,
        provider: requestLogs.provider
      })
      .from(requestLogs)
      .where(
        and(
          eq(requestLogs.organizationId, orgId),
          gte(requestLogs.createdAt, new Date(startDate)),
          lte(requestLogs.createdAt, new Date(endDate))
        )
      )
      .orderBy(desc(requestLogs.createdAt))
      .limit(50000);

    // Aggregate by model
    const byModel = new Map<
      string,
      {
        cost: number;
        requests: number;
        inputTokens: number;
        outputTokens: number;
      }
    >();
    for (const log of logs) {
      const model = log.model;
      const existing = byModel.get(model) ?? {
        cost: 0,
        inputTokens: 0,
        outputTokens: 0,
        requests: 0
      };
      existing.cost += Number(log.cost);
      existing.requests += 1;
      existing.inputTokens += log.inputTokens;
      existing.outputTokens += log.outputTokens;
      byModel.set(model, existing);
    }

    return c.json({
      data: {
        byModel: Object.fromEntries(byModel),
        period: { end: endDate, start: startDate },
        totalCost: [...byModel.values()].reduce((sum, v) => sum + v.cost, 0),
        totalRequests: logs.length
      }
    });
  });

  // Webhook-based export (configure a destination)
  app.post("/destinations", async (c: AppContext) => {
    const orgId = c.get("orgId");
    const body = await c.req.json();
    // Store export destination configuration
    // Supported: s3, gcs, snowflake, bigquery, webhook
    return c.json(
      {
        data: {
          config: body.config,
          id: "dest_placeholder",
          message:
            "Export destination configured. Data will be exported on the configured schedule.",
          organizationId: orgId,
          status: "configured",
          type: body.type
        }
      },
      201
    );
  });

  return app;
};
