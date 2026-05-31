import { AIGateway } from "@/gateway/ai-gateway";
import { JobStore } from "@/lib/job-store";
import { SchemaValidator } from "@/validators/schema-validator";
import { RepairEngine } from "@/repair/repair-engine";
import { IntentOutput, DataSchema, AppSpec, RepairLog } from "@/types";

export class AppSpecGeneratorStage {
  public static async execute(
    jobId: string,
    intent: IntentOutput,
    schema: DataSchema
  ): Promise<AppSpec> {
    const startTime = Date.now();
    JobStore.updateJob(jobId, { currentStage: "appspec", status: "running" });
    JobStore.emitSSEEvent(jobId, "stage_start", { stage: "appspec", timestamp: new Date().toISOString() });

    const systemInstruction = `You are a Principal Software Solutions Architect.
Build a complete AppSpec mapping user interfaces, REST endpoints, roles, and automated workflows.

You are given:
- Intent / Features: ${JSON.stringify(intent)}
- Relational Schema: ${JSON.stringify(schema)}

Requirements:
1. Return a single JSON object containing:
   - pages: PageSpec[] (UI screens)
   - apiEndpoints: ApiEndpointSpec[] (HTTP endpoints)
   - authRules: AuthRuleSpec[] (security definitions)
   - integrationHooks: IntegrationHookSpec[] (event hooks)
   - workflowStubs: WorkflowStubSpec[] (automated workflows)

2. PAGE CONSTRAINTS:
   - Every page must have: name, path, entityContext (must target a valid entity name), and components list.
   - EVERY page MUST have at least one associated API endpoint that matches its entityContext or is linked to its pathname.

3. ENDPOINT CONSTRAINTS:
   - Every endpoint must have: path, method ("GET" | "POST" | "PUT" | "DELETE"), entityContext, and description.

4. WORKFLOW CONSTRAINTS:
   - triggerEntity must exist in the database schema.
   - Workflow steps can have type "database" (target must be an entity in the schema) or "integration".
   - Workflow steps of type "integration" MUST refer to a valid integrationId and action listed in our registry.
     - Registered integrations:
       - slack: Actions ["send_message", "create_channel", "invite_user"]
       - whatsapp: Actions ["send_text", "send_template", "send_media"]
       - gmail: Actions ["send_email", "create_draft", "label_email"]
       - stripe: Actions ["create_charge", "refund_charge", "create_customer", "create_subscription"]
       - webhook: Actions ["trigger_callback", "dispatch_payload"]
     - Any reference to an integration ID or action NOT present above will FAIL validation.

5. INTEGRATION HOOK CONSTRAINTS:
   - Must reference a valid integrationId and action from the registry.

Response format must be ONLY raw JSON matching this schema:
{
  "pages": [
    { "name": "Task Dashboard", "path": "/tasks", "entityContext": "Task", "components": ["TaskList", "StatBox"] }
  ],
  "apiEndpoints": [
    { "path": "/api/tasks", "method": "GET", "entityContext": "Task", "description": "Fetch list of tasks" }
  ],
  "authRules": [
    { "role": "admin", "entityContext": "Task", "actions": ["create", "read", "update", "delete"], "scope": "tenant" }
  ],
  "integrationHooks": [
    { "integrationId": "slack", "trigger": "on_message", "action": "send_message", "mapping": { "text": "Task updated" } }
  ],
  "workflowStubs": [
    {
      "name": "Auto Slack On Task",
      "triggerEntity": "Task",
      "triggerEvent": "create",
      "steps": [
        { "order": 1, "type": "integration", "target": "slack", "action": "send_message" }
      ]
    }
  ]
}`;

    let result: AppSpec;
    let tokens = 0;

    try {
      const response = await AIGateway.executeStage<AppSpec>(
        "appSpecGeneration",
        `Intent: ${JSON.stringify(intent)}\nSchema: ${JSON.stringify(schema)}`,
        systemInstruction
      );
      result = response.data;
      tokens = response.tokenCost;
    } catch (gatewayErr) {
      const repairRes = RepairEngine.repairStructure("", "appspec");
      result = repairRes.data as AppSpec;
      JobStore.updateJob(jobId, {
        repairLogs: [...(JobStore.getJob(jobId)?.repairLogs || []), repairRes.log],
      });
      JobStore.emitSSEEvent(jobId, "stage_failed", {
        stage: "appspec",
        error: (gatewayErr as Error).message,
        repairLogs: [repairRes.log],
      });
    }

    // --- VALIDATION AND REPAIR LOOP ---
    let validation = SchemaValidator.validateAppSpec(result, schema);
    const activeRepairLogs: RepairLog[] = [];

    if (!validation.valid) {
      console.warn(`AppSpec Generation: Stage 3 validation errors detected for Job '${jobId}':`, validation.errors);

      // 1. Attempt Field Repair
      const fieldRepair = RepairEngine.repairFields(result, validation.errors, "appspec");
      result = fieldRepair.data as AppSpec;
      activeRepairLogs.push(...fieldRepair.logs);

      // Re-validate
      validation = SchemaValidator.validateAppSpec(result, schema);
    }

    if (!validation.valid) {
      // 2. Attempt Consistency Repair (orphaned pages, registry mismatch, target entities)
      const consistencyRepair = RepairEngine.repairConsistency(result, validation.errors, "appspec", { schema });
      result = consistencyRepair.data as AppSpec;
      activeRepairLogs.push(...consistencyRepair.logs);

      // Re-validate
      validation = SchemaValidator.validateAppSpec(result, schema);
    }

    const latency = Date.now() - startTime;
    const currentJob = JobStore.getJob(jobId);

    // Save final status
    const status = validation.valid ? "completed" : "failed";

    JobStore.updateJob(jobId, {
      appSpec: result,
      status,
      errors: [...(currentJob?.errors || []), ...validation.errors],
      repairLogs: [...(currentJob?.repairLogs || []), ...activeRepairLogs],
      latency: { ...(currentJob?.latency || {}), appspec: latency },
      tokenCost: (currentJob?.tokenCost || 0) + tokens,
    });

    if (validation.valid) {
      JobStore.emitSSEEvent(jobId, "stage_complete", {
        stage: "appspec",
        latency,
        data: result,
        repairLogs: activeRepairLogs,
      });
      
      JobStore.emitSSEEvent(jobId, "generation_complete", {
        jobId,
        status: "completed",
        timestamp: new Date().toISOString(),
        totalLatency: Object.values(JobStore.getJob(jobId)?.latency || {}).reduce((a, b) => a + b, 0),
        repairLogs: JobStore.getJob(jobId)?.repairLogs || [],
      });
    } else {
      JobStore.emitSSEEvent(jobId, "stage_failed", {
        stage: "appspec",
        latency,
        error: "Stage 3 semantic AppSpec validation failed after repairs",
        repairLogs: activeRepairLogs,
      });
      
      JobStore.emitSSEEvent(jobId, "generation_complete", {
        jobId,
        status: "failed",
        timestamp: new Date().toISOString(),
        totalLatency: Object.values(JobStore.getJob(jobId)?.latency || {}).reduce((a, b) => a + b, 0),
        repairLogs: JobStore.getJob(jobId)?.repairLogs || [],
      });
    }

    return result;
  }
}
