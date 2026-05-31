import { z } from "zod";
import { AppSpecOutputSchema } from "./appSpec";
import { ValidationResultSchema, PipelineEventSchema, RepairLogSchema } from "./common";
import { DataSchemaOutputSchema } from "./schema";
import { IntentOutputSchema } from "./intent";

export const JobStatusSchema = z.enum(["queued", "running", "completed", "failed"]);
export type JobStatus = z.infer<typeof JobStatusSchema>;

export const GenerationJobSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  status: JobStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  intent: IntentOutputSchema.optional(),
  dataSchema: DataSchemaOutputSchema.optional(),
  appSpec: AppSpecOutputSchema.optional(),
  validation: ValidationResultSchema.optional(),
  repairLogs: z.array(RepairLogSchema),
  events: z.array(PipelineEventSchema),
  error: z.string().optional(),
  tokenCost: z.number().nonnegative()
});

export type GenerationJob = z.infer<typeof GenerationJobSchema>;
