import { createMiddleware } from "hono/factory";

export const requestTiming = () => {
  return createMiddleware(async (c, next) => {
    const start = performance.now();
    await next();
    const duration = performance.now() - start;
    c.header("X-Response-Time", `${duration.toFixed(2)}ms`);
  });
};
