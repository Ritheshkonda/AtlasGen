import { NextResponse } from "next/server";
import { JobStore } from "@/lib/job-store";
import { SchemaValidator } from "@/validators/schema-validator";
import { RepairEngine } from "@/repair/repair-engine";
import { AppSpec, DataSchema, IntentOutput, RepairLog, ValidationError } from "@/types";

export async function POST(
  req: Request,
  { params }: { params: { jobId: string } }
) {
  const { jobId } = params;
  const job = JobStore.getJob(jobId);

  if (!job) {
    return NextResponse.json({ error: `Job '${jobId}' not found.` }, { status: 404 });
  }

  const timestamp = new Date().toISOString();
  const repairLogs: RepairLog[] = [];
  let updatedErrors: ValidationError[] = [];

  let intent = job.intent;
  let schema = job.schema;
  let appSpec = job.appSpec;

  // 1. Repair Stage 1: Intent
  if (intent) {
    let validation = SchemaValidator.validateIntent(intent);
    if (!validation.valid) {
      const fieldRepair = RepairEngine.repairFields(intent, validation.errors, "intent");
      intent = fieldRepair.data as IntentOutput;
      repairLogs.push(...fieldRepair.logs);

      validation = SchemaValidator.validateIntent(intent);
      updatedErrors.push(...validation.errors);
    }
  }

  // 2. Repair Stage 2: Schema
  if (schema) {
    let validation = SchemaValidator.validateSchema(schema);
    if (!validation.valid) {
      // Run field repair
      const fieldRepair = RepairEngine.repairFields(schema, validation.errors, "schema");
      schema = fieldRepair.data as DataSchema;
      repairLogs.push(...fieldRepair.logs);

      // Run consistency repair
      validation = SchemaValidator.validateSchema(schema);
      const consistencyRepair = RepairEngine.repairConsistency(schema, validation.errors, "schema");
      schema = consistencyRepair.data as DataSchema;
      repairLogs.push(...consistencyRepair.logs);

      validation = SchemaValidator.validateSchema(schema);
      updatedErrors.push(...validation.errors);
    }
  }

  // 3. Repair Stage 3: AppSpec
  if (appSpec) {
    let validation = SchemaValidator.validateAppSpec(appSpec, schema);
    if (!validation.valid) {
      // Run field repair
      const fieldRepair = RepairEngine.repairFields(appSpec, validation.errors, "appspec");
      appSpec = fieldRepair.data as AppSpec;
      repairLogs.push(...fieldRepair.logs);

      // Run consistency repair
      validation = SchemaValidator.validateAppSpec(appSpec, schema);
      const consistencyRepair = RepairEngine.repairConsistency(appSpec, validation.errors, "appspec", { schema });
      appSpec = consistencyRepair.data as AppSpec;
      repairLogs.push(...consistencyRepair.logs);

      validation = SchemaValidator.validateAppSpec(appSpec, schema);
      updatedErrors.push(...validation.errors);
    }
  }

  // Re-evaluate complete validation state
  const hasErrors = updatedErrors.some((e) => e.severity === "error");
  const finalStatus = hasErrors ? "failed" : "completed";

  JobStore.updateJob(jobId, {
    intent,
    schema,
    appSpec,
    status: finalStatus,
    errors: updatedErrors,
    repairLogs: [...job.repairLogs, ...repairLogs],
  });

  // Emit repair complete event
  JobStore.emitSSEEvent(jobId, "generation_complete", {
    jobId,
    status: finalStatus,
    timestamp: new Date().toISOString(),
    repaired: true,
    repairLogs,
  });

  return NextResponse.json({
    success: repairLogs.some((l) => l.outcome === "repaired"),
    status: finalStatus,
    errors: updatedErrors,
    repairLogs,
  });
}
