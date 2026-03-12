import { createMiddleware } from "hono/factory";

type RequestIdContext = {
  Variables: {
    requestId: string;
  };
};

export const requestId = () => {
  return createMiddleware<RequestIdContext>(async (c, next) => {
    const id = crypto.randomUUID();
    c.set("requestId", id);
    await next();
    c.header("X-Request-Id", id);
  });
};
