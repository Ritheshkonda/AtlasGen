import { IntentOutputSchema } from "@/types/intent";
import type { IntentOutput } from "@/types/intent";
import type { ValidationResult } from "@/types/common";
import { validateWithZod, fail } from "./core";

export const validateIntent = (value: unknown): ValidationResult => {
  const structure = validateWithZod(IntentOutputSchema, value, "intent");
  if (!structure.valid) return structure;
  const intent = value as IntentOutput;
  const errors = [];
  if (!intent.clarification_required && intent.assumptions.length === 0 && intent.features.length < 2) {
    errors.push({ code: "vague_prompt", message: "Vague intent must include assumptions or request clarification.", path: "intent.assumptions", severity: "error" as const });
  }
  return fail(errors);
};
