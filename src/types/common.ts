import { z } from "zod";

export const ValidationErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  path: z.string(),
  severity: z.enum(["error", "warning"]).default("error")
});

export type ValidationError = z.infer<typeof ValidationErrorSchema>;

export const ValidationResultSchema = z.object({
  valid: z.boolean(),
  errors: z.array(ValidationErrorSchema)
});

export type ValidationResult = z.infer<typeof ValidationResultSchema>;

export const RepairLogSchema = z.object({
  timestamp: z.string(),
  stage: z.string(),
  strategy: z.enum(["structural", "field", "consistency"]),
  error: z.string(),
  outcome: z.string()
});

export type RepairLog = z.infer<typeof RepairLogSchema>;

export const StageNameSchema = z.enum(["intentExtraction", "schemaGeneration", "appSpecGeneration"]);
export type StageName = z.infer<typeof StageNameSchema>;

export const PipelineEventTypeSchema = z.enum([
  "stage_start",
  "stage_complete",
  "stage_failed",
  "generation_complete"
]);

export type PipelineEventType = z.infer<typeof PipelineEventTypeSchema>;

export const PipelineEventSchema = z.object({
  id: z.number(),
  type: PipelineEventTypeSchema,
  stage: StageNameSchema.optional(),
  timestamp: z.string(),
  latency: z.number().nonnegative(),
  repairLogs: z.array(RepairLogSchema),
  message: z.string().optional()
});

export type PipelineEvent = z.infer<typeof PipelineEventSchema>;

export interface StageResult<TOutput> {
  output: TOutput;
  validation: ValidationResult;
  repairLogs: RepairLog[];
  latency: number;
}
