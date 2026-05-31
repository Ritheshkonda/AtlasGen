import type { PipelineEvent, RepairLog, StageName, ValidationResult } from "@/types/common";
import type { GenerationJob } from "@/types/job";
import { createPipelineEvent } from "@/logs/logger";
import { runIntentExtraction } from "@/stages/intentExtraction";
import { runSchemaGeneration } from "@/stages/schemaGeneration";
import { runAppSpecGeneration } from "@/stages/appSpecGeneration";
import { repairAppSpec } from "@/repair/engine";
import { validateAppSpec } from "@/validators/appSpecValidator";

const jobs = new Map<string, GenerationJob>();
const listeners = new Map<string, Set<(event: PipelineEvent) => void>>();

const newId = (): string => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const save = (job: GenerationJob): void => {
  jobs.set(job.id, { ...job, updatedAt: new Date().toISOString() });
};

export const getJob = (jobId: string): GenerationJob | undefined => jobs.get(jobId);

export const listJobs = (): GenerationJob[] => [...jobs.values()];

const emit = (job: GenerationJob, event: Omit<PipelineEvent, "id">): void => {
  const pipelineEvent = createPipelineEvent({ ...event, id: job.events.length + 1 });
  job.events.push(pipelineEvent);
  save(job);
  listeners.get(job.id)?.forEach((listener) => listener(pipelineEvent));
};

export const subscribeToJob = (jobId: string, listener: (event: PipelineEvent) => void): (() => void) => {
  const set = listeners.get(jobId) ?? new Set<(event: PipelineEvent) => void>();
  set.add(listener);
  listeners.set(jobId, set);
  return () => {
    set.delete(listener);
    if (set.size === 0) listeners.delete(jobId);
  };
};

const stageStart = (job: GenerationJob, stage: StageName): void => emit(job, { type: "stage_start", stage, timestamp: new Date().toISOString(), latency: 0, repairLogs: [] });
const stageComplete = (job: GenerationJob, stage: StageName, latency: number, repairLogs: RepairLog[]): void => emit(job, { type: "stage_complete", stage, timestamp: new Date().toISOString(), latency, repairLogs });
const stageFailed = (job: GenerationJob, stage: StageName, latency: number, repairLogs: RepairLog[], message: string): void => emit(job, { type: "stage_failed", stage, timestamp: new Date().toISOString(), latency, repairLogs, message });

const combineValidation = (...results: ValidationResult[]): ValidationResult => {
  const errors = results.flatMap((result) => result.errors);
  return { valid: errors.length === 0, errors };
};

export const createGenerationJob = (prompt: string): GenerationJob => {
  const now = new Date().toISOString();
  const job: GenerationJob = { id: newId(), prompt, status: "queued", createdAt: now, updatedAt: now, repairLogs: [], events: [], tokenCost: Math.max(0.001, prompt.length * 0.000006) };
  save(job);
  void runJob(job.id);
  return job;
};

export const runJob = async (jobId: string): Promise<void> => {
  const job = jobs.get(jobId);
  if (!job) return;
  job.status = "running";
  save(job);
  try {
    stageStart(job, "intentExtraction");
    const intent = await runIntentExtraction({ prompt: job.prompt });
    job.intent = intent.output;
    job.repairLogs.push(...intent.repairLogs);
    stageComplete(job, "intentExtraction", intent.latency, intent.repairLogs);
    if (!intent.validation.valid) stageFailed(job, "intentExtraction", intent.latency, intent.repairLogs, "Intent validation failed after repair.");

    stageStart(job, "schemaGeneration");
    const dataSchema = await runSchemaGeneration(intent.output);
    job.dataSchema = dataSchema.output;
    job.repairLogs.push(...dataSchema.repairLogs);
    stageComplete(job, "schemaGeneration", dataSchema.latency, dataSchema.repairLogs);
    if (!dataSchema.validation.valid) stageFailed(job, "schemaGeneration", dataSchema.latency, dataSchema.repairLogs, "Schema validation failed after repair.");

    stageStart(job, "appSpecGeneration");
    const appSpec = await runAppSpecGeneration(intent.output, dataSchema.output);
    job.appSpec = appSpec.output;
    job.repairLogs.push(...appSpec.repairLogs);
    job.validation = combineValidation(intent.validation, dataSchema.validation, appSpec.validation);
    stageComplete(job, "appSpecGeneration", appSpec.latency, appSpec.repairLogs);
    if (!appSpec.validation.valid) stageFailed(job, "appSpecGeneration", appSpec.latency, appSpec.repairLogs, "AppSpec validation failed after repair.");

    job.status = job.validation.valid ? "completed" : "failed";
    emit(job, { type: "generation_complete", timestamp: new Date().toISOString(), latency: intent.latency + dataSchema.latency + appSpec.latency, repairLogs: job.repairLogs, message: job.status });
    save(job);
  } catch (error) {
    job.status = "failed";
    job.error = error instanceof Error ? error.message : "Unknown pipeline error";
    emit(job, { type: "generation_complete", timestamp: new Date().toISOString(), latency: 0, repairLogs: job.repairLogs, message: job.error });
    save(job);
  }
};

export const repairJob = (jobId: string): GenerationJob | undefined => {
  const job = jobs.get(jobId);
  if (!job?.appSpec || !job.dataSchema) return job;
  const repaired = repairAppSpec(job.appSpec, job.dataSchema);
  job.appSpec = repaired.value;
  job.repairLogs.push(...repaired.logs);
  job.validation = validateAppSpec(repaired.value, job.dataSchema);
  job.status = job.validation.valid ? "completed" : "failed";
  emit(job, { type: "stage_complete", stage: "appSpecGeneration", timestamp: new Date().toISOString(), latency: 0, repairLogs: repaired.logs, message: "Manual repair applied." });
  save(job);
  return job;
};
