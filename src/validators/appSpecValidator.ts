import { AppSpecOutputSchema } from "@/types/appSpec";
import type { AppSpecOutput } from "@/types/appSpec";
import type { DataSchemaOutput } from "@/types/schema";
import type { ValidationError, ValidationResult } from "@/types/common";
import { getIntegration, hasIntegrationAction } from "@/integrations/registry";
import { fail, mergeResults, validateWithZod } from "./core";

export const validateAppSpec = (value: unknown, dataSchema: DataSchemaOutput): ValidationResult => {
  const structure = validateWithZod(AppSpecOutputSchema, value, "appSpec");
  if (!structure.valid) return structure;
  const appSpec = value as AppSpecOutput;
  const errors: ValidationError[] = [];
  const entities = new Set(dataSchema.entities.map((entity) => entity.name));
  const endpoints = new Map(appSpec.apiEndpoints.map((endpoint) => [endpoint.id, endpoint]));

  appSpec.pages.forEach((page) => {
    const endpoint = endpoints.get(page.apiEndpointId);
    if (!endpoint) {
      errors.push({ code: "page_missing_endpoint", message: `Page ${page.id} references missing API endpoint ${page.apiEndpointId}.`, path: `appSpec.pages.${page.id}.apiEndpointId`, severity: "error" });
    } else if (endpoint.entity !== page.entity) {
      errors.push({ code: "page_endpoint_entity_mismatch", message: `Page ${page.id} entity does not match endpoint entity.`, path: `appSpec.pages.${page.id}.entity`, severity: "error" });
    }
    if (!entities.has(page.entity)) {
      errors.push({ code: "page_missing_entity", message: `Page ${page.id} references missing entity ${page.entity}.`, path: `appSpec.pages.${page.id}.entity`, severity: "error" });
    }
  });

  appSpec.apiEndpoints.forEach((endpoint) => {
    if (!entities.has(endpoint.entity)) {
      errors.push({ code: "endpoint_missing_entity", message: `Endpoint ${endpoint.id} references missing entity ${endpoint.entity}.`, path: `appSpec.apiEndpoints.${endpoint.id}.entity`, severity: "error" });
    }
  });

  appSpec.authRules.forEach((rule) => {
    if (!entities.has(rule.entity)) {
      errors.push({ code: "auth_missing_entity", message: `Auth rule ${rule.id} references missing entity ${rule.entity}.`, path: `appSpec.authRules.${rule.id}.entity`, severity: "error" });
    }
  });

  appSpec.integrationHooks.forEach((hook) => {
    const integration = getIntegration(hook.integrationId);
    if (!integration) {
      errors.push({ code: "integration_missing", message: `Integration ${hook.integrationId} is not registered.`, path: `appSpec.integrationHooks.${hook.id}.integrationId`, severity: "error" });
      return;
    }
    if (!hasIntegrationAction(hook.integrationId, hook.actionId)) {
      errors.push({ code: "integration_action_missing", message: `Action ${hook.actionId} is missing for ${hook.integrationId}.`, path: `appSpec.integrationHooks.${hook.id}.actionId`, severity: "error" });
    }
    if (!entities.has(hook.entity)) {
      errors.push({ code: "hook_missing_entity", message: `Hook ${hook.id} references missing entity ${hook.entity}.`, path: `appSpec.integrationHooks.${hook.id}.entity`, severity: "error" });
    }
  });

  appSpec.workflowStubs.forEach((workflow) => {
    if (!entities.has(workflow.entity)) {
      errors.push({ code: "workflow_missing_entity", message: `Workflow ${workflow.id} references missing entity ${workflow.entity}.`, path: `appSpec.workflowStubs.${workflow.id}.entity`, severity: "error" });
    }
    if (workflow.integrationId && workflow.actionId && !hasIntegrationAction(workflow.integrationId, workflow.actionId)) {
      errors.push({ code: "workflow_action_missing", message: `Workflow ${workflow.id} action ${workflow.actionId} is missing for ${workflow.integrationId}.`, path: `appSpec.workflowStubs.${workflow.id}.actionId`, severity: "error" });
    }
  });

  return mergeResults([structure, fail(errors)]);
};
