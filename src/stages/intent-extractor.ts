import { AIGateway } from "@/gateway/ai-gateway";
import { JobStore } from "@/lib/job-store";
import { SchemaValidator } from "@/validators/schema-validator";
import { RepairEngine } from "@/repair/repair-engine";
import { IntentOutput, RepairLog } from "@/types";
import { SemanticValidator } from "@/validators/semanticValidator";

export class IntentExtractorStage {
  public static async execute(jobId: string, prompt: string): Promise<IntentOutput> {
    const startTime = Date.now();
    JobStore.updateJob(jobId, { currentStage: "intent", status: "running" });
    JobStore.emitSSEEvent(jobId, "stage_start", { stage: "intent", timestamp: new Date().toISOString() });

    const systemInstruction = `You are a strict JSON extraction AI. Analyze the user request for building a software application.
Extract the application intent and output a JSON object with the following fields:
1. appName: string (descriptive name for the app)
2. appType: must be one of: "crm" | "project_management" | "ecommerce" | "hr_tool" | "inventory" | "content_platform" | "analytics" | "custom"
3. features: string[] (key features of the app)
4. entities: string[] (main database entities needed, e.g., ["Lead", "Contact"])
5. integrations_requested: string[] (list of integrations requested; must select from: "slack", "whatsapp", "gmail", "stripe", "webhook")
6. assumptions: string[] (assumptions made to resolve ambiguity)

IMPORTANT REQUIREMENT:
If the user prompt is extremely vague (e.g. "An app" or "Task manager but make it smart"), you must NOT fail. Instead, you must generate a set of creative and complete assumptions and default features/entities that form a fully functional SaaS application of that category.

Response format must be ONLY raw JSON matching this schema:
{
  "appName": "...",
  "appType": "...",
  "features": [...],
  "entities": [...],
  "integrations_requested": [...],
  "assumptions": [...]
}`;

    let result: IntentOutput;
    let tokens = 0;

    try {
      const response = await AIGateway.executeStage<IntentOutput>(
        "intentExtraction",
        prompt,
        systemInstruction
      );
      result = response.data;
      tokens = response.tokenCost;
    } catch (gatewayErr) {
      // If the gateway throws structurally, do a structural repair on the error message (or trigger default mock)
      const repairRes = RepairEngine.repairStructure("", "intent");
      result = repairRes.data as IntentOutput;
      JobStore.updateJob(jobId, {
        repairLogs: [...(JobStore.getJob(jobId)?.repairLogs || []), repairRes.log],
      });
      JobStore.emitSSEEvent(jobId, "stage_failed", {
        stage: "intent",
        error: (gatewayErr as Error).message,
        repairLogs: [repairRes.log],
      });
    }

    // --- VALIDATION AND REPAIR LOOP ---
    let validation = SchemaValidator.validateIntent(result);
    const activeRepairLogs: RepairLog[] = [];

    if (!validation.valid) {
      console.warn(`Intent Extraction: Stage 1 validation errors detected for Job '${jobId}':`, validation.errors);
      
      // 1. Attempt Field Repair
      const fieldRepair = RepairEngine.repairFields(result, validation.errors, "intent");
      result = fieldRepair.data as IntentOutput;
      activeRepairLogs.push(...fieldRepair.logs);

      // Re-validate
      validation = SchemaValidator.validateIntent(result);
    }

    const semanticValidation = SemanticValidator.validateIntent(prompt, result);
    if (!semanticValidation.valid) {
      const semanticRepair = RepairEngine.repairIntentSemantics(result, semanticValidation.errors);
      result = semanticRepair.data;
      activeRepairLogs.push(...semanticRepair.logs);
      validation = SchemaValidator.validateIntent(result);
    }

    const latency = Date.now() - startTime;
    const currentJob = JobStore.getJob(jobId);
    
    // Save state
    JobStore.updateJob(jobId, {
      intent: result,
      errors: [...(currentJob?.errors || []), ...validation.errors],
      semanticErrors: semanticValidation.errors,
      repairLogs: [...(currentJob?.repairLogs || []), ...activeRepairLogs],
      latency: { ...(currentJob?.latency || {}), intent: latency },
      tokenCost: (currentJob?.tokenCost || 0) + tokens,
    });

    if (validation.valid) {
      JobStore.emitSSEEvent(jobId, "stage_complete", {
        stage: "intent",
        latency,
        data: result,
        repairLogs: activeRepairLogs,
      });
    } else {
      JobStore.emitSSEEvent(jobId, "stage_failed", {
        stage: "intent",
        latency,
        error: "Stage 1 semantic validation failed after repairs",
        repairLogs: activeRepairLogs,
      });
    }

    return result;
  }
}
