export class AppError extends Error {
  readonly title: string;

  constructor(
    message: string,
    readonly statusCode: number,
    readonly code: string,
    readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AppError";
    this.title = message;
  }

  toProblemDetails(instance?: string): ProblemDetails {
    return {
      detail: this.message,
      instance,
      status: this.statusCode,
      title: this.title,
      type: "about:blank",
      ...(this.details ? this.details : {})
    };
  }
}

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  [key: string]: unknown;
}

export class NotFoundError extends AppError {
  constructor(message = "Not found", details?: Record<string, unknown>) {
    super(message, 404, "NOT_FOUND", details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized", details?: Record<string, unknown>) {
    super(message, 401, "UNAUTHORIZED", details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden", details?: Record<string, unknown>) {
    super(message, 403, "FORBIDDEN", details);
  }
}

export class ValidationError extends AppError {
  constructor(
    message = "Validation failed",
    details?: Record<string, unknown>
  ) {
    super(message, 400, "VALIDATION_ERROR", details);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict", details?: Record<string, unknown>) {
    super(message, 409, "CONFLICT", details);
  }
}

export class RateLimitError extends AppError {
  constructor(
    message = "Too many requests",
    details?: Record<string, unknown>
  ) {
    super(message, 429, "RATE_LIMITED", details);
  }
}

export class GuardrailError extends AppError {
  constructor(
    message = "Request blocked by guardrail",
    details?: Record<string, unknown>
  ) {
    super(message, 403, "GUARDRAIL_BLOCKED", details);
  }
}

export class BudgetExceededError extends AppError {
  constructor(
    message = "Budget limit exceeded",
    details?: Record<string, unknown>
  ) {
    super(message, 429, "BUDGET_EXCEEDED", details);
  }
}

export class PlanLimitError extends AppError {
  constructor(
    message = "Plan request limit exceeded",
    details?: Record<string, unknown>
  ) {
    super(message, 429, "PLAN_LIMIT_EXCEEDED", details);
  }
}

export class PreconditionFailedError extends AppError {
  constructor(
    message = "Precondition failed",
    details?: Record<string, unknown>
  ) {
    super(message, 412, "PRECONDITION_FAILED", details);
  }
}
