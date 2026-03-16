import { Hono } from "hono";
import { metrics } from "./prometheus";

export const createObservabilityModule = () => {
  const app = new Hono();

  // Prometheus metrics endpoint
  app.get("/metrics", (c) => {
    return c.text(metrics.serialize(), 200, {
      "Content-Type": "text/plain; version=0.0.4; charset=utf-8"
    });
  });

  // Health check with details
  app.get("/health/detailed", (c) => {
    return c.json({
      memory: process.memoryUsage(),
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  return app;
};
