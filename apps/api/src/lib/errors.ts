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

const createErrorClass = (
  statusCode: number,
  code: string,
  defaultMessage: string
) => {
  return class extends AppError {
    constructor(message = defaultMessage, details?: Record<string, unknown>) {
      super(message, statusCode, code, details);
    }
  };
};

export const NotFoundError = createErrorClass(404, "NOT_FOUND", "Not found");
export const UnauthorizedError = createErrorClass(
  401,
  "UNAUTHORIZED",
  "Unauthorized"
);
export const ForbiddenError = createErrorClass(403, "FORBIDDEN", "Forbidden");
export const ValidationError = createErrorClass(
  400,
  "VALIDATION_ERROR",
  "Validation failed"
);
export const ConflictError = createErrorClass(409, "CONFLICT", "Conflict");
export const RateLimitError = createErrorClass(
  429,
  "RATE_LIMITED",
  "Too many requests"
);
export const GuardrailError = createErrorClass(
  403,
  "GUARDRAIL_BLOCKED",
  "Request blocked by guardrail"
);
export const BudgetExceededError = createErrorClass(
  429,
  "BUDGET_EXCEEDED",
  "Budget limit exceeded"
);
export const PreconditionFailedError = createErrorClass(
  412,
  "PRECONDITION_FAILED",
  "Precondition failed"
);
