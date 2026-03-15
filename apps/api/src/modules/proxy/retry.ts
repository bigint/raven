import pRetry from "p-retry";

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

export interface RetryOptions {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

const DEFAULT_OPTIONS: RetryOptions = {
  baseDelayMs: 500,
  maxDelayMs: 4000,
  maxRetries: 2
};

export const isRetryableStatus = (status: number): boolean =>
  RETRYABLE_STATUS_CODES.has(status);

class RetryableResponseError<T> extends Error {
  constructor(readonly result: T) {
    super("Retryable status code");
  }
}

export const withRetry = async <T extends { response: Response }>(
  fn: () => Promise<T>,
  options?: Partial<RetryOptions>
): Promise<T> => {
  const { baseDelayMs, maxDelayMs, maxRetries } = {
    ...DEFAULT_OPTIONS,
    ...options
  };

  try {
    return await pRetry(
      async () => {
        const result = await fn();

        if (isRetryableStatus(result.response.status)) {
          throw new RetryableResponseError(result);
        }

        return result;
      },
      {
        factor: 2,
        maxRetryTime: Number.POSITIVE_INFINITY,
        minTimeout: baseDelayMs,
        maxTimeout: maxDelayMs,
        randomize: true,
        retries: maxRetries
      }
    );
  } catch (err) {
    if (err instanceof RetryableResponseError) {
      return err.result as T;
    }
    throw err;
  }
};
