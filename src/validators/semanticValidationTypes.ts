import { AppType, IntentOutput, SemanticValidationSnapshot } from "@/types";

export type SemanticValidationErrorType =
  | "AMBIGUOUS_REQUIREMENT"
  | "INSUFFICIENT_CONTEXT"
  | "CONFLICTING_APP_TYPES"
  | "OVERSCOPED_APPLICATION"
  | "UNKNOWN_INTEGRATION"
  | "UNDEFINED_AI_BEHAVIOR";

export interface SemanticValidationError extends SemanticValidationSnapshot {
  type: SemanticValidationErrorType;
  severity: "warning" | "error";
  message: string;
  repairable: true;
}

export interface SemanticValidationResult {
  valid: boolean;
  errors: SemanticValidationError[];
}

export type SemanticAppTypeCandidate = AppType | "invoicing";

export interface IntentSemanticRepairResult {
  intent: IntentOutput;
  clarification_required?: true;
}
