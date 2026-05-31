import type { StageResult } from "@/types/common";
import type { IntentOutput } from "@/types/intent";
import type { DataSchemaOutput } from "@/types/schema";
import type { AppSpecOutput, IntegrationHook, WorkflowStub } from "@/types/appSpec";
import { aiGateway } from "@/gateway/aiGateway";
import { integrationRegistry } from "@/integrations/registry";
import { slugify } from "@/lib/json";
import { validateAppSpec } from "@/validators/appSpecValidator";
import { repairAppSpec } from "@/repair/engine";

const preferredAction = (integrationId: string): string => {
  const integration = integrationRegistry.find((candidate) => candidate.id === integrationId);
  return integration?.actions[0]?.id ?? "send_request";
};

export const runAppSpecGeneration = async (intent: IntentOutput, dataSchema: DataSchemaOutput): Promise<StageResult<AppSpecOutput>> => {
  const started = Date.now();
  const apiEndpoints = dataSchema.entities.flatMap((entity) => [
    { id: `${slugify(entity.name)}_list`, method: "GET" as const, path: `/api/${slugify(entity.name)}`, entity: entity.name, authRequired: true },
    { id: `${slugify(entity.name)}_create`, method: "POST" as const, path: `/api/${slugify(entity.name)}`, entity: entity.name, authRequired: true }
  ]);
  const pages = dataSchema.entities.map((entity) => ({
    id: `${slugify(entity.name)}_page`,
    title: `${entity.name} Management`,
    route: `/${slugify(entity.name)}`,
    entity: entity.name,
    apiEndpointId: `${slugify(entity.name)}_list`
  }));
  const integrationHooks: IntegrationHook[] = intent.integrations_requested.map((integrationId, index) => ({
    id: `${integrationId}_hook_${index + 1}`,
    integrationId,
    actionId: preferredAction(integrationId),
    entity: dataSchema.entities[index % dataSchema.entities.length]?.name ?? dataSchema.entities[0]?.name ?? "Item"
  }));
  const workflowStubs: WorkflowStub[] = [
    ...dataSchema.entities.map((entity) => ({ id: `${slugify(entity.name)}_approval`, name: `${entity.name} Review Workflow`, entity: entity.name, steps: ["validate_input", "apply_auth_rules", "persist_record", "emit_audit_event"] })),
    ...integrationHooks.map((hook) => ({ id: `${hook.id}_workflow`, name: `${hook.integrationId} ${hook.actionId}`, entity: hook.entity, integrationId: hook.integrationId, actionId: hook.actionId, steps: ["load_record", "map_payload", "execute_integration_action"] }))
  ];
  const generated: AppSpecOutput = {
    pages,
    apiEndpoints,
    authRules: dataSchema.entities.map((entity) => ({ id: `${slugify(entity.name)}_access`, entity: entity.name, roles: ["admin", "member"], permissions: ["create", "read", "update", "delete"] })),
    integrationHooks,
    workflowStubs
  };
  const response = await aiGateway.generate("appSpecGeneration", intent.appName, generated);
  const validation = validateAppSpec(response.content, dataSchema);
  if (validation.valid) return { output: response.content as AppSpecOutput, validation, repairLogs: [], latency: Date.now() - started };
  const repaired = repairAppSpec(response.content, dataSchema);
  return { output: repaired.value, validation: repaired.validation, repairLogs: repaired.logs, latency: Date.now() - started };
};
