export const log = {
  info: (message: string, meta?: Record<string, unknown>): void => {
    console.log(
      JSON.stringify({
        level: "info",
        message,
        timestamp: new Date().toISOString(),
        ...meta
      })
    );
  },
  error: (
    message: string,
    error?: unknown,
    meta?: Record<string, unknown>
  ): void => {
    const errorMeta: Record<string, unknown> = { ...meta };
    if (error instanceof Error) {
      errorMeta.error = error.message;
      errorMeta.stack = error.stack;
    } else if (error !== undefined) {
      errorMeta.error = String(error);
    }
    console.error(
      JSON.stringify({
        level: "error",
        message,
        timestamp: new Date().toISOString(),
        ...errorMeta
      })
    );
  }
};
