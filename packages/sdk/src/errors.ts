export class RavenError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "RavenError";
    this.status = status;
  }
}

export class AuthenticationError extends RavenError {
  constructor(message = "Invalid or missing API key") {
    super(message, 401);
    this.name = "AuthenticationError";
  }
}

export class RateLimitError extends RavenError {
  constructor(message = "Rate limit exceeded") {
    super(message, 429);
    this.name = "RateLimitError";
  }
}

export class ProviderError extends RavenError {
  constructor(message: string, status: number) {
    super(message, status);
    this.name = "ProviderError";
  }
}

export const toRavenError = (message: string, status: number): RavenError => {
  if (status === 401) return new AuthenticationError(message);
  if (status === 429) return new RateLimitError(message);
  if (status >= 500) return new ProviderError(message, status);
  return new RavenError(message, status);
};
