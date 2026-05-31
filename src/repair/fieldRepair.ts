import type { AppSpecOutput } from "@/types/appSpec";
import type { RepairLog, StageName } from "@/types/common";
import type { IntentOutput } from "@/types/intent";
import type { DataSchemaOutput, EntitySchema } from "@/types/schema";
import { createRepairLog } from "@/logs/logger";
import { asStringArray, isRecord, slugify, titleCase } from "@/lib/json";

export interface FieldRepairResult<T> { value: T; logs: RepairLog[] }

export const repairIntentFields = (stage: StageName, value: unknown): FieldRepairResult<IntentOutput> => {
  const record = isRecord(value) ? value : {};
  const prompt = typeof record.prompt === "string" ? record.prompt : "Custom application";
  const output: IntentOutput = {
    appName: typeof record.appName === "string" && record.appName.trim() ? record.appName : titleCase(`${prompt} App`).slice(0, 60),
    appType: ["crm", "project_management", "ecommerce", "hr_tool", "inventory", "content_platform", "analytics", "custom"].includes(String(record.appType)) ? record.appType as IntentOutput["appType"] : "custom",
    features: asStringArray(record.features).length > 0 ? asStringArray(record.features) : ["Dashboard", "Record management", "Reporting"],
    entities: asStringArray(record.entities).length > 0 ? asStringArray(record.entities) : ["Workspace", "User", "Item"],
    integrations_requested: asStringArray(record.integrations_requested),
    assumptions: asStringArray(record.assumptions).length > 0 ? asStringArray(record.assumptions) : ["Generated sensible defaults because the prompt was underspecified."],
    clarification_required: typeof record.clarification_required === "boolean" ? record.clarification_required : undefined
  };
  return { value: output, logs: [createRepairLog({ stage, strategy: "field", error: "Intent fields were missing or incorrectly typed.", outcome: "Applied typed intent defaults." })] };
};

const tenantField = { name: "tenantId", type: "string" as const, required: true, unique: false };

export const repairSchemaFields = (stage: StageName, value: unknown, intent: IntentOutput): FieldRepairResult<DataSchemaOutput> => {
  const record = isRecord(value) ? value : {};
  const rawEntities = Array.isArray(record.entities) ? record.entities : intent.entities;
  const entities: EntitySchema[] = rawEntities.map((raw, index) => {
    const entityRecord = isRecord(raw) ? raw : { name: String(raw) };
    const name = typeof entityRecord.name === "string" ? titleCase(entityRecord.name) : titleCase(intent.entities[index] ?? `Entity ${index + 1}`);
    const fields = Array.isArray(entityRecord.fields) ? entityRecord.fields.filter(isRecord).map((field) => ({
      name: typeof field.name === "string" ? field.name : "name",
      type: ["string", "number", "boolean", "date", "json", "currency", "email"].includes(String(field.type)) ? field.type as EntitySchema["fields"][number]["type"] : "string",
      required: typeof field.required === "boolean" ? field.required : true,
      unique: typeof field.unique === "boolean" ? field.unique : false
    })) : [];
    const safeFields = fields.some((field) => field.name === "tenantId") ? fields : [tenantField, ...fields];
    if (!safeFields.some((field) => field.name === "id")) safeFields.push({ name: "id", type: "string", required: true, unique: true });
    if (!safeFields.some((field) => field.name === "name")) safeFields.push({ name: "name", type: "string", required: true, unique: false });
    return { name, tableName: typeof entityRecord.tableName === "string" ? entityRecord.tableName : slugify(name), fields: safeFields, relations: [] };
  });
  return { value: { entities }, logs: [createRepairLog({ stage, strategy: "field", error: "Schema fields were missing or incorrectly typed.", outcome: "Applied tenantId and terminal entity defaults." })] };
};

export const repairAppSpecFields = (stage: StageName, value: unknown, dataSchema: DataSchemaOutput): FieldRepairResult<AppSpecOutput> => {
  const record = isRecord(value) ? value : {};
  const endpoints = dataSchema.entities.map((entity) => ({ id: `${slugify(entity.name)}_list`, method: "GET" as const, path: `/api/${slugify(entity.name)}`, entity: entity.name, authRequired: true }));
  const output: AppSpecOutput = {
    pages: Array.isArray(record.pages) ? record.pages.filter(isRecord).map((page, index) => {
      const entity = typeof page.entity === "string" ? page.entity : dataSchema.entities[index % dataSchema.entities.length]?.name ?? "Item";
      return { id: typeof page.id === "string" ? page.id : `${slugify(entity)}_page`, title: typeof page.title === "string" ? page.title : `${entity} Page`, route: typeof page.route === "string" && page.route.startsWith("/") ? page.route : `/${slugify(entity)}`, entity, apiEndpointId: typeof page.apiEndpointId === "string" ? page.apiEndpointId : `${slugify(entity)}_list` };
    }) : [],
    apiEndpoints: endpoints,
    authRules: dataSchema.entities.map((entity) => ({ id: `${slugify(entity.name)}_member_access`, entity: entity.name, roles: ["admin", "member"], permissions: ["create", "read", "update", "delete"] })),
    integrationHooks: [],
    workflowStubs: []
  };
  if (output.pages.length === 0) output.pages = dataSchema.entities.map((entity) => ({ id: `${slugify(entity.name)}_page`, title: `${entity.name} Management`, route: `/${slugify(entity.name)}`, entity: entity.name, apiEndpointId: `${slugify(entity.name)}_list` }));
  return { value: output, logs: [createRepairLog({ stage, strategy: "field", error: "AppSpec fields were missing or incorrectly typed.", outcome: "Applied page, endpoint, auth, hook, and workflow defaults." })] };
};
