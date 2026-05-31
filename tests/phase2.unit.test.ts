import assert from "node:assert/strict";
import test from "node:test";
import { RepairEngine } from "../src/repair/repair-engine";
import { SchemaValidator } from "../src/validators/schema-validator";
import { SemanticValidator } from "../src/validators/semanticValidator";
import { AppSpec, DataSchema, IntentOutput } from "../src/types";

const taskSchema: DataSchema = {
  entities: [
    {
      name: "Task",
      tableName: "tasks",
      tenantId: "tenant_default",
      fields: [
        { name: "id", type: "string", required: true, isPrimaryKey: true },
        { name: "tenantId", type: "string", required: true },
      ],
      relations: [],
    },
  ],
};

test("intent validation returns structured errors and field repair adds defaults", () => {
  const invalidIntent = {
    appType: 42,
    features: [],
    entities: [],
    integrations_requested: [],
    assumptions: [],
  };
  const validation = SchemaValidator.validateIntent(invalidIntent);
  assert.equal(validation.valid, false);
  assert.ok(validation.errors.every((issue) => issue.stage === "intent" && issue.code.length > 0));

  const repaired = RepairEngine.repairFields(invalidIntent, validation.errors, "intent");
  const repairedValidation = SchemaValidator.validateIntent(repaired.data);
  assert.equal(repairedValidation.valid, false);
  assert.ok(repaired.logs.length > 0);
});

test("schema validation finds and repairs an inverse relation", () => {
  const schema: DataSchema = {
    entities: [
      {
        name: "Project",
        tableName: "projects",
        tenantId: "tenant_default",
        fields: [
          { name: "id", type: "string", required: true, isPrimaryKey: true },
          { name: "tenantId", type: "string", required: true },
        ],
        relations: [{ type: "hasMany", targetEntity: "Task", foreignKey: "projectId" }],
      },
      taskSchema.entities[0],
    ],
  };
  const validation = SchemaValidator.validateSchema(schema);
  assert.ok(validation.errors.some((issue) => issue.code === "relation_inverse_missing"));

  const repaired = RepairEngine.repairConsistency(schema, validation.errors, "schema");
  assert.equal(SchemaValidator.validateSchema(repaired.data).valid, true);
  assert.ok(repaired.logs.some((log) => log.strategy === "consistency_repair"));
});

test("AppSpec validation repairs page API and integration mismatches", () => {
  const appSpec: AppSpec = {
    pages: [{ name: "Tasks", path: "/tasks", entityContext: "Task", components: ["TaskList"] }],
    apiEndpoints: [],
    authRules: [],
    integrationHooks: [{ integrationId: "slack", trigger: "on_message", action: "unknown_action", mapping: {} }],
    workflowStubs: [],
  };
  const validation = SchemaValidator.validateAppSpec(appSpec, taskSchema);
  assert.ok(validation.errors.some((issue) => issue.code === "page_api_missing"));
  assert.ok(validation.errors.some((issue) => issue.code === "integration_action_missing"));

  const repaired = RepairEngine.repairConsistency(appSpec, validation.errors, "appspec", { schema: taskSchema });
  assert.equal(SchemaValidator.validateAppSpec(repaired.data, taskSchema).valid, true);
});

test("structural repair recovers truncated JSON and records a log", () => {
  const raw = '{"appName":"Tasks","appType":"custom","features":[],"entities":["Task"],"integrations_requested":[],"assumptions":[]';
  const repaired = RepairEngine.repairStructure(raw, "intent");
  assert.equal(repaired.success, true);
  assert.equal((repaired.data as IntentOutput).appName, "Tasks");
  assert.equal(repaired.log.strategy, "structural_repair");
});

test("semantic validation generates assumptions for ambiguous smart behavior", () => {
  const intent: IntentOutput = {
    appName: "Smart Tasks",
    appType: "project_management",
    features: ["Task tracking"],
    entities: ["Task"],
    integrations_requested: [],
    assumptions: [],
  };
  const validation = SemanticValidator.validateIntent("Make a smart task manager", intent);
  assert.ok(validation.errors.some((issue) => issue.type === "AMBIGUOUS_REQUIREMENT"));
  assert.ok(validation.errors.some((issue) => issue.type === "UNDEFINED_AI_BEHAVIOR"));

  const repaired = RepairEngine.repairIntentSemantics(intent, validation.errors);
  assert.ok(repaired.data.assumptions.includes("AI task prioritization"));
  assert.ok(repaired.logs.every((log) => log.details && log.errorType.length > 0));
});

test("semantic validation reduces overscope and replaces unsupported integrations", () => {
  const intent: IntentOutput = {
    appName: "Enterprise Tasks",
    appType: "project_management",
    features: ["Payments", "Chat", "Analytics", "Marketplace", "Mobile app", "AI assistant", "Video calls", "File uploads"],
    entities: ["Task"],
    integrations_requested: ["telegram"],
    assumptions: [],
  };
  const prompt = "Build a task manager with payments, chat, analytics, marketplace, mobile app, AI assistant, video calls, file uploads, and Telegram";
  const validation = SemanticValidator.validateIntent(prompt, intent);
  assert.ok(validation.errors.some((issue) => issue.type === "OVERSCOPED_APPLICATION"));
  assert.ok(validation.errors.some((issue) => issue.type === "UNKNOWN_INTEGRATION"));

  const repaired = RepairEngine.repairIntentSemantics(intent, validation.errors);
  assert.ok(repaired.data.integrations_requested.includes("whatsapp"));
  assert.ok(repaired.logs.some((log) => log.strategy === "scope_reduction"));
});

test("semantic validation records clarification defaults for vague prompts", () => {
  const intent: IntentOutput = {
    appName: "Application",
    appType: "custom",
    features: [],
    entities: ["Item"],
    integrations_requested: [],
    assumptions: [],
  };
  const validation = SemanticValidator.validateIntent("An app", intent);
  assert.ok(validation.errors.some((issue) => issue.type === "INSUFFICIENT_CONTEXT"));

  const repaired = RepairEngine.repairIntentSemantics(intent, validation.errors);
  assert.equal(repaired.clarification_required, true);
  assert.ok(repaired.data.assumptions.includes("Multi-tenant workspace"));
});

test("semantic validation selects a primary type for conflicting requests", () => {
  const intent: IntentOutput = {
    appName: "Operations",
    appType: "crm",
    features: ["Lead tracking", "Project boards", "Invoices"],
    entities: ["Lead", "Project", "Invoice"],
    integrations_requested: [],
    assumptions: [],
  };
  const validation = SemanticValidator.validateIntent("A CRM but also a project manager but also an invoicing tool", intent);
  assert.ok(validation.errors.some((issue) => issue.type === "CONFLICTING_APP_TYPES"));

  const repaired = RepairEngine.repairIntentSemantics(intent, validation.errors);
  assert.equal(repaired.data.appType, "crm");
  assert.ok(repaired.logs.some((log) => log.details.selectedType === "crm"));
});
