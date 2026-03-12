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

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const computeDelay = (
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number
): number => {
  const exponential = baseDelayMs * 2 ** attempt;
  const jitter = Math.random() * 100;
  return Math.min(exponential + jitter, maxDelayMs);
};

export const isRetryableStatus = (status: number): boolean =>
  RETRYABLE_STATUS_CODES.has(status);

export const withRetry = async <T extends { response: Response }>(
  fn: () => Promise<T>,
  options?: Partial<RetryOptions>
): Promise<T> => {
  const { baseDelayMs, maxDelayMs, maxRetries } = {
    ...DEFAULT_OPTIONS,
    ...options
  };

  let lastError: Error | undefined;
  let lastResult: T | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();

      if (!isRetryableStatus(result.response.status)) {
        return result;
      }

      lastResult = result;

      if (attempt < maxRetries) {
        const delay = computeDelay(attempt, baseDelayMs, maxDelayMs);
        await sleep(delay);
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt < maxRetries) {
        const delay = computeDelay(attempt, baseDelayMs, maxDelayMs);
        await sleep(delay);
      }
    }
  }

  if (lastResult) {
    return lastResult;
  }

  throw lastError ?? new Error("All retry attempts failed");
};
