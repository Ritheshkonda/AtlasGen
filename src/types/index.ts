import { z } from "zod";

// ==========================================
// STAGE 1: INTENT EXTRACTION
// ==========================================

export const AppTypeSchema = z.enum([
  "crm",
  "project_management",
  "ecommerce",
  "hr_tool",
  "inventory",
  "content_platform",
  "analytics",
  "custom",
]);

export type AppType = z.infer<typeof AppTypeSchema>;

export const ClarificationRequiredSchema = z.object({
  clarification_required: z.literal(true),
  questions: z.array(z.string().min(1)).min(1),
  assumptions: z.array(z.string()),
}).strict();

export type ClarificationRequired = z.infer<typeof ClarificationRequiredSchema>;

export const IntentOutputSchema = z.object({
  appName: z.string().min(1, "appName cannot be empty"),
  appType: AppTypeSchema,
  features: z.array(z.string().min(1)),
  entities: z.array(z.string().min(1)),
  integrations_requested: z.array(z.string()),
  assumptions: z.array(z.string()),
}).strict();

export type IntentOutput = z.infer<typeof IntentOutputSchema>;
export type IntentExtractionOutput = IntentOutput | ClarificationRequired;

// ==========================================
// STAGE 2: DATA SCHEMA
// ==========================================

export const FieldTypeSchema = z.enum([
  "string",
  "number",
  "boolean",
  "datetime",
  "json",
  "text",
]);

export type FieldType = z.infer<typeof FieldTypeSchema>;

export const FieldSchema = z.object({
  name: z.string().min(1),
  type: FieldTypeSchema,
  required: z.boolean(),
  isPrimaryKey: z.boolean().optional(),
}).strict();

export type Field = z.infer<typeof FieldSchema>;

export const RelationTypeSchema = z.enum(["hasOne", "hasMany", "belongsTo"]);
export type RelationType = z.infer<typeof RelationTypeSchema>;

export const RelationSchema = z.object({
  type: RelationTypeSchema,
  targetEntity: z.string().min(1),
  foreignKey: z.string().min(1),
}).strict();

export type Relation = z.infer<typeof RelationSchema>;

export const EntitySchema = z.object({
  name: z.string().min(1),
  tableName: z.string().min(1),
  fields: z.array(FieldSchema),
  relations: z.array(RelationSchema),
  tenantId: z.string().min(1), // Required multi-tenant isolation ID
}).strict();

export type Entity = z.infer<typeof EntitySchema>;

export const DataSchemaSchema = z.object({
  entities: z.array(EntitySchema),
}).strict();

export type DataSchema = z.infer<typeof DataSchemaSchema>;

// ==========================================
// STAGE 3: APPSPEC SPECIFICATION
// ==========================================

export const PageSpecSchema = z.object({
  name: z.string().min(1),
  path: z.string().startsWith("/"),
  entityContext: z.string().min(1), // Target entity this page displays/interacts with
  components: z.array(z.string()),
}).strict();

export type PageSpec = z.infer<typeof PageSpecSchema>;

export const ApiEndpointSpecSchema = z.object({
  path: z.string().startsWith("/"),
  method: z.enum(["GET", "POST", "PUT", "DELETE"]),
  entityContext: z.string().min(1),
  description: z.string().optional(),
}).strict();

export type ApiEndpointSpec = z.infer<typeof ApiEndpointSpecSchema>;

export const AuthRuleSpecSchema = z.object({
  role: z.string().min(1),
  entityContext: z.string().min(1),
  actions: z.array(z.enum(["create", "read", "update", "delete"])),
  scope: z.enum(["tenant", "user", "global"]),
}).strict();

export type AuthRuleSpec = z.infer<typeof AuthRuleSpecSchema>;

export const IntegrationHookSpecSchema = z.object({
  integrationId: z.string().min(1),
  trigger: z.string().min(1),
  action: z.string().min(1),
  mapping: z.record(z.string(), z.string()), // parameters mapping e.g. { "text": "message" }
}).strict();

export type IntegrationHookSpec = z.infer<typeof IntegrationHookSpecSchema>;

export const WorkflowStepSpecSchema = z.object({
  order: z.number().int().positive(),
  type: z.enum(["database", "integration", "notification"]),
  target: z.string().min(1),
  action: z.string().min(1),
}).strict();

export const WorkflowStubSpecSchema = z.object({
  name: z.string().min(1),
  triggerEntity: z.string().min(1),
  triggerEvent: z.enum(["create", "update", "delete"]),
  steps: z.array(WorkflowStepSpecSchema),
}).strict();

export type WorkflowStubSpec = z.infer<typeof WorkflowStubSpecSchema>;

export const AppSpecSchema = z.object({
  pages: z.array(PageSpecSchema),
  apiEndpoints: z.array(ApiEndpointSpecSchema),
  authRules: z.array(AuthRuleSpecSchema),
  integrationHooks: z.array(IntegrationHookSpecSchema),
  workflowStubs: z.array(WorkflowStubSpecSchema),
}).strict();

export type AppSpec = z.infer<typeof AppSpecSchema>;

// ==========================================
// VALIDATION & REPAIR TYPES
// ==========================================

export type ValidationErrorCode =
  | "invalid_structure"
  | "missing_required_field"
  | "invalid_field_type"
  | "missing_entity"
  | "missing_primary_key"
  | "missing_tenant_field"
  | "duplicate_entity"
  | "relation_target_missing"
  | "relation_inverse_missing"
  | "page_entity_missing"
  | "page_api_missing"
  | "auth_entity_missing"
  | "workflow_entity_missing"
  | "integration_missing"
  | "integration_action_missing";

export interface ValidationError {
  stage: StageName;
  code: ValidationErrorCode;
  path: string;
  message: string;
  severity: "error" | "warning";
  repairable: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export type RepairStrategy =
  | "structural_repair"
  | "field_repair"
  | "consistency_repair"
  | "scope_reduction"
  | "assumption_generation";
export type StageName = "intent" | "schema" | "appspec";
export type PipelineStageKey = "intentExtraction" | "schemaGeneration" | "appSpecGeneration";
export type PipelineStatus = "idle" | "running" | "completed" | "failed";
export type CurrentStage = "none" | StageName;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type StageOutput = IntentOutput | DataSchema | AppSpec;

export interface RepairLog {
  timestamp: string;
  stage: StageName;
  strategy: RepairStrategy;
  errorType: string;
  outcome: string;
  details: Record<string, JsonValue>;
}

export interface SemanticValidationSnapshot {
  type: string;
  severity: "warning" | "error";
  message: string;
  details: Record<string, JsonValue>;
}

// ==========================================
// PIPELINE & JOB TRACKING TYPES
// ==========================================

export interface PipelineJob {
  jobId: string;
  prompt: string;
  status: PipelineStatus;
  currentStage: CurrentStage;
  intent?: IntentOutput;
  schema?: DataSchema;
  appSpec?: AppSpec;
  errors: ValidationError[];
  semanticErrors: SemanticValidationSnapshot[];
  repairLogs: RepairLog[];
  latency: Record<string, number>; // latency in ms per stage
  tokenCost?: number;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// AI GATEWAY CONFIG TYPES
// ==========================================

export interface GatewayRoute {
  primary: ProviderId;
  fallback?: ProviderId;
}

export interface GatewayConfig {
  intentExtraction: GatewayRoute;
  schemaGeneration: GatewayRoute;
  appSpecGeneration: GatewayRoute;
}

export const ProviderIdSchema = z.enum([
  "openai",
  "groq",
  "gemini",
  "anthropic",
  "deepseek",
  "openrouter",
  "mistral",
  "mock",
]);

export type ProviderId = z.infer<typeof ProviderIdSchema>;

export const GatewayConfigSchema = z.object({
  intentExtraction: z.object({
    primary: ProviderIdSchema,
    fallback: ProviderIdSchema.optional(),
  }),
  schemaGeneration: z.object({
    primary: ProviderIdSchema,
    fallback: ProviderIdSchema.optional(),
  }),
  appSpecGeneration: z.object({
    primary: ProviderIdSchema,
    fallback: ProviderIdSchema.optional(),
  }),
});

export type SSEEventType =
  | "stage_start"
  | "stage_complete"
  | "stage_failed"
  | "generation_complete";

export interface SSEEvent {
  id: string;
  type: SSEEventType;
  data: unknown;
}

export interface EvaluationLogEntry {
  name: string;
  prompt: string;
  category: "benchmark" | "edge_case";
  success: boolean;
  latency: number;
  repairCount: number;
  tokenCost: number;
  errors: string[];
}
