import { AIGateway } from "@/gateway/ai-gateway";
import { JobStore } from "@/lib/job-store";
import { SchemaValidator } from "@/validators/schema-validator";
import { RepairEngine } from "@/repair/repair-engine";
import { IntentOutput, DataSchema, RepairLog } from "@/types";

export class SchemaGeneratorStage {
  public static async execute(jobId: string, intent: IntentOutput): Promise<DataSchema> {
    const startTime = Date.now();
    JobStore.updateJob(jobId, { currentStage: "schema", status: "running" });
    JobStore.emitSSEEvent(jobId, "stage_start", { stage: "schema", timestamp: new Date().toISOString() });

    const systemInstruction = `You are a professional Relational Database Architect. 
Design a robust multi-tenant PostgreSQL/MySQL schema based on the provided intent and features.

Requirements:
1. Return a single JSON object containing "entities", which is an array of Entity schemas.
2. EVERY Entity schema MUST contain:
   - name: string (CamelCase name, e.g. "CustomerProfile")
   - tableName: string (lowercase, pluralized table name, e.g. "customer_profiles")
   - tenantId: string (must default to "tenant_default" to satisfy multi-tenant isolation requirement)
   - fields: Array of Field schemas
   - relations: Array of Relation schemas
3. EVERY field schema must have:
   - name: string (field name)
   - type: must be one of "string" | "number" | "boolean" | "datetime" | "json" | "text"
   - required: boolean
   - isPrimaryKey: boolean (optional, true for the "id" field)
4. EVERY Entity MUST have a primary key field named "id" of type "string".
5. RELATIONSHIPS MUST BE BIDIRECTIONALLY CONSISTENT:
   - Relations can only be: "hasOne" | "hasMany" | "belongsTo"
   - If entity A has a "hasMany" relation to B with foreignKey "fk_id", then entity B MUST have a "belongsTo" relation back to A with matching foreignKey "fk_id".
   - Bidirectional symmetry is strictly audited.

Response format must be ONLY raw JSON matching this schema:
{
  "entities": [
    {
      "name": "User",
      "tableName": "users",
      "tenantId": "tenant_default",
      "fields": [
        { "name": "id", "type": "string", "required": true, "isPrimaryKey": true },
        { "name": "tenantId", "type": "string", "required": true },
        { "name": "email", "type": "string", "required": true }
      ],
      "relations": [
        { "type": "hasMany", "targetEntity": "Post", "foreignKey": "userId" }
      ]
    }
  ]
}`;

    let result: DataSchema;
    let tokens = 0;

    try {
      const response = await AIGateway.executeStage<DataSchema>(
        "schemaGeneration",
        JSON.stringify(intent),
        systemInstruction
      );
      result = response.data;
      tokens = response.tokenCost;
    } catch (gatewayErr) {
      const repairRes = RepairEngine.repairStructure("", "schema");
      result = repairRes.data as DataSchema;
      JobStore.updateJob(jobId, {
        repairLogs: [...(JobStore.getJob(jobId)?.repairLogs || []), repairRes.log],
      });
      JobStore.emitSSEEvent(jobId, "stage_failed", {
        stage: "schema",
        error: (gatewayErr as Error).message,
        repairLogs: [repairRes.log],
      });
    }

    // --- VALIDATION AND REPAIR LOOP ---
    let validation = SchemaValidator.validateSchema(result);
    const activeRepairLogs: RepairLog[] = [];

    // 1. Structural Repair (in case fields are missing on outer structure)
    if (!validation.valid) {
      // 2. Field Repair (inject missing tenantId, restore fields arrays, add primary keys)
      const fieldRepair = RepairEngine.repairFields(result, validation.errors, "schema");
      result = fieldRepair.data as DataSchema;
      activeRepairLogs.push(...fieldRepair.logs);

      // Re-validate
      validation = SchemaValidator.validateSchema(result);
    }

    if (!validation.valid) {
      // 3. Consistency Repair (establish bidirectional relation symmetry)
      const consistencyRepair = RepairEngine.repairConsistency(result, validation.errors, "schema");
      result = consistencyRepair.data as DataSchema;
      activeRepairLogs.push(...consistencyRepair.logs);

      // Re-validate
      validation = SchemaValidator.validateSchema(result);
    }

    const latency = Date.now() - startTime;
    const currentJob = JobStore.getJob(jobId);

    // Save state
    JobStore.updateJob(jobId, {
      schema: result,
      errors: [...(currentJob?.errors || []), ...validation.errors],
      repairLogs: [...(currentJob?.repairLogs || []), ...activeRepairLogs],
      latency: { ...(currentJob?.latency || {}), schema: latency },
      tokenCost: (currentJob?.tokenCost || 0) + tokens,
    });

    if (validation.valid) {
      JobStore.emitSSEEvent(jobId, "stage_complete", {
        stage: "schema",
        latency,
        data: result,
        repairLogs: activeRepairLogs,
      });
    } else {
      JobStore.emitSSEEvent(jobId, "stage_failed", {
        stage: "schema",
        latency,
        error: "Stage 2 semantic schema validation failed after repairs",
        repairLogs: activeRepairLogs,
      });
    }

    return result;
  }
}
