import { NextResponse } from "next/server";
import { JobStore } from "@/lib/job-store";
import { AIGateway } from "@/gateway/ai-gateway";
import { IntentExtractorStage } from "@/stages/intent-extractor";
import { SchemaGeneratorStage } from "@/stages/schema-generator";
import { AppSpecGeneratorStage } from "@/stages/appspec-generator";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt, routingConfig } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json({ error: "A valid prompt is required." }, { status: 400 });
    }

    if (routingConfig) {
      AIGateway.setRoutingConfig(routingConfig);
    }

    const jobId = `job_${Math.random().toString(36).substring(2, 11)}`;
    JobStore.createJob(jobId, prompt);

    // Run pipeline asynchronously to prevent API timeout
    runPipeline(jobId, prompt).catch((err) => {
      console.error(`Pipeline Job '${jobId}' crash in background:`, err);
    });

    return NextResponse.json({ jobId }, { status: 202 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

async function runPipeline(jobId: string, prompt: string) {
  try {
    // Stage 1: Intent Extraction
    const intent = await IntentExtractorStage.execute(jobId, prompt);
    let currentJob = JobStore.getJob(jobId);

    // Stop pipeline if Stage 1 failed and remains invalid (blocking errors exist)
    const hasStage1Errors = currentJob?.errors.some(
      (e) => e.severity === "error" && e.path.startsWith("intent")
    );
    if (!currentJob || hasStage1Errors) {
      JobStore.updateJob(jobId, { status: "failed" });
      return;
    }

    // Stage 2: Data Schema Generation
    const schema = await SchemaGeneratorStage.execute(jobId, intent);
    currentJob = JobStore.getJob(jobId);

    const hasStage2Errors = currentJob?.errors.some(
      (e) => e.severity === "error" && e.path.startsWith("schema")
    );
    if (!currentJob || hasStage2Errors) {
      JobStore.updateJob(jobId, { status: "failed" });
      return;
    }

    // Stage 3: AppSpec Generation
    await AppSpecGeneratorStage.execute(jobId, intent, schema);
  } catch (err) {
    console.error(`Unhandled error inside pipeline process for Job '${jobId}':`, err);
    JobStore.updateJob(jobId, {
      status: "failed",
    });
    JobStore.emitSSEEvent(jobId, "stage_failed", {
      stage: JobStore.getJob(jobId)?.currentStage || "none",
      error: `Fatal pipeline crash: ${(err as Error).message}`,
      repairLogs: [],
    });
  }
}
