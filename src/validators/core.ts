import type { ZodSchema } from "zod";
import type { ValidationError, ValidationResult } from "@/types/common";

export const ok = (): ValidationResult => ({ valid: true, errors: [] });
export const fail = (errors: ValidationError[]): ValidationResult => ({ valid: errors.length === 0, errors });

export const validateWithZod = <T>(schema: ZodSchema<T>, value: unknown, rootPath: string): ValidationResult => {
  const result = schema.safeParse(value);
  if (result.success) return ok();
  return fail(
    result.error.issues.map((issue) => ({
      code: issue.code,
      message: issue.message,
      path: [rootPath, ...issue.path.map(String)].join("."),
      severity: "error"
    }))
  );
};

export const mergeResults = (results: ValidationResult[]): ValidationResult => {
  const errors = results.flatMap((result) => result.errors);
  return { valid: errors.length === 0, errors };
};
