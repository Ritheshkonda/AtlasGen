import type { AppSpecOutput } from "@/types/appSpec";
import type { RepairLog, StageName, ValidationResult } from "@/types/common";
import type { IntentOutput } from "@/types/intent";
import type { DataSchemaOutput } from "@/types/schema";
import { validateIntent } from "@/validators/intentValidator";
import { validateDataSchema } from "@/validators/schemaValidator";
import { validateAppSpec } from "@/validators/appSpecValidator";
import { structuralRepair } from "./structuralRepair";
import { repairAppSpecFields, repairIntentFields, repairSchemaFields } from "./fieldRepair";
import { repairAppSpecConsistency, repairSchemaConsistency } from "./consistencyRepair";

export interface RepairOutcome<T> { value: T; validation: ValidationResult; logs: RepairLog[] }

export const repairIntent = (value: unknown): RepairOutcome<IntentOutput> => {
  const structural = structuralRepair("intentExtraction", value);
  const field = repairIntentFields("intentExtraction", structural.value);
  const validation = validateIntent(field.value);
  return { value: field.value, validation, logs: [...structural.logs, ...field.logs] };
};

export const repairDataSchema = (value: unknown, intent: IntentOutput): RepairOutcome<DataSchemaOutput> => {
  const structural = structuralRepair("schemaGeneration", value);
  const field = repairSchemaFields("schemaGeneration", structural.value, intent);
  const consistency = repairSchemaConsistency("schemaGeneration", field.value);
  const validation = validateDataSchema(consistency.value);
  return { value: consistency.value, validation, logs: [...structural.logs, ...field.logs, ...consistency.logs] };
};

export const repairAppSpec = (value: unknown, dataSchema: DataSchemaOutput): RepairOutcome<AppSpecOutput> => {
  const structural = structuralRepair("appSpecGeneration", value);
  const field = repairAppSpecFields("appSpecGeneration", structural.value, dataSchema);
  const consistency = repairAppSpecConsistency("appSpecGeneration", field.value, dataSchema);
  const validation = validateAppSpec(consistency.value, dataSchema);
  return { value: consistency.value, validation, logs: [...structural.logs, ...field.logs, ...consistency.logs] };
};
