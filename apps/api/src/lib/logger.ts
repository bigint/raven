type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  readonly level: LogLevel;
  readonly message: string;
  readonly timestamp: string;
  readonly [key: string]: unknown;
}

const formatEntry = (
  level: LogLevel,
  message: string,
  meta?: Record<string, unknown>
): LogEntry => ({
  level,
  message,
  timestamp: new Date().toISOString(),
  ...meta
});

export const log = {
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
    console.error(JSON.stringify(formatEntry("error", message, errorMeta)));
  },
  info: (message: string, meta?: Record<string, unknown>): void => {
    console.log(JSON.stringify(formatEntry("info", message, meta)));
  },
  warn: (message: string, meta?: Record<string, unknown>): void => {
    console.warn(JSON.stringify(formatEntry("warn", message, meta)));
  }
};
