import { ZodError } from "zod";

import { ValidationError } from "./app-error";

export function handleValidationError(error: ZodError): ValidationError {
  const details = error.errors.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
  return new ValidationError("Validation failed", { fields: details });
}

export function formatZodErrors(error: ZodError): Record<string, string> {
  const formatted: Record<string, string> = {};
  for (const issue of error.errors) {
    const key = issue.path.join(".") || "root";
    formatted[key] = issue.message;
  }
  return formatted;
}
