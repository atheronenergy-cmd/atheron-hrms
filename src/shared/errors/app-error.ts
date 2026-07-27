export enum ErrorCode {
  VALIDATION_ERROR = "VALIDATION_ERROR",
  AUTHENTICATION_ERROR = "AUTHENTICATION_ERROR",
  AUTHORIZATION_ERROR = "AUTHORIZATION_ERROR",
  NOT_FOUND = "NOT_FOUND",
  CONFLICT = "CONFLICT",
  BUSINESS_RULE_ERROR = "BUSINESS_RULE_ERROR",
  RATE_LIMIT_ERROR = "RATE_LIMIT_ERROR",
  INTERNAL_ERROR = "INTERNAL_ERROR",
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: ErrorCode,
    statusCode: number,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  toJSON() {
    return {
      success: false as const,
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
      },
    };
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation failed", details?: Record<string, unknown>) {
    super(message, ErrorCode.VALIDATION_ERROR, 400, details);
    this.name = "ValidationError";
  }
}

export class AuthenticationError extends AppError {
  constructor(message = "Authentication required") {
    super(message, ErrorCode.AUTHENTICATION_ERROR, 401);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends AppError {
  constructor(message = "You do not have permission to perform this action") {
    super(message, ErrorCode.AUTHORIZATION_ERROR, 403);
    this.name = "AuthorizationError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      id ? `${resource} with id '${id}' not found` : `${resource} not found`,
      ErrorCode.NOT_FOUND,
      404,
    );
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource conflict") {
    super(message, ErrorCode.CONFLICT, 409);
    this.name = "ConflictError";
  }
}

export class BusinessRuleError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, ErrorCode.BUSINESS_RULE_ERROR, 422, details);
    this.name = "BusinessRuleError";
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Too many requests") {
    super(message, ErrorCode.RATE_LIMIT_ERROR, 429);
    this.name = "RateLimitError";
  }
}

export class InternalError extends AppError {
  constructor(message = "An unexpected error occurred") {
    super(message, ErrorCode.INTERNAL_ERROR, 500);
    this.name = "InternalError";
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function handleApiError(error: unknown) {
  if (isAppError(error)) {
    return Response.json(error.toJSON(), { status: error.statusCode });
  }
  console.error("Unhandled API error:", error);
  return Response.json(new InternalError().toJSON(), { status: 500 });
}
