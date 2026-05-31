import type { AppSpecOutput } from "@/types/appSpec";
import type { RepairLog, StageName } from "@/types/common";
import type { DataSchemaOutput, EntitySchema, Relation } from "@/types/schema";
import { integrationRegistry, hasIntegrationAction } from "@/integrations/registry";
import { createRepairLog } from "@/logs/logger";
import { slugify } from "@/lib/json";

export interface ConsistencyRepairResult<T> { value: T; logs: RepairLog[] }

const inverseFor = (type: Relation["type"]): Relation["type"] => type === "hasMany" ? "belongsTo" : "hasMany";

export const repairSchemaConsistency = (stage: StageName, schema: DataSchemaOutput): ConsistencyRepairResult<DataSchemaOutput> => {
  const logs: RepairLog[] = [];
  const entities = schema.entities.map((entity) => ({ ...entity, relations: [...entity.relations] }));
  const findEntity = (name: string): EntitySchema | undefined => entities.find((entity) => entity.name === name);
  entities.forEach((entity) => {
    entity.relations.forEach((relation) => {
      const target = findEntity(relation.targetEntity);
      if (!target) return;
      const hasInverse = target.relations.some((candidate) => candidate.name === relation.inverse && candidate.targetEntity === entity.name);
      if (!hasInverse) {
        target.relations.push({ name: relation.inverse, type: inverseFor(relation.type), targetEntity: entity.name, inverse: relation.name });
        logs.push(createRepairLog({ stage, strategy: "consistency", error: `Missing inverse relation ${relation.inverse}.`, outcome: `Added inverse relation on ${target.name}.` }));
      }
    });
  });
  return { value: { entities }, logs };
};

export const repairAppSpecConsistency = (stage: StageName, appSpec: AppSpecOutput, dataSchema: DataSchemaOutput): ConsistencyRepairResult<AppSpecOutput> => {
  const logs: RepairLog[] = [];
  const entities = new Set(dataSchema.entities.map((entity) => entity.name));
  const firstEntity = dataSchema.entities[0]?.name ?? "Item";
  const apiEndpoints = [...appSpec.apiEndpoints];
  const endpointById = new Map(apiEndpoints.map((endpoint) => [endpoint.id, endpoint]));

  const pages = appSpec.pages.map((page) => {
    const entity = entities.has(page.entity) ? page.entity : firstEntity;
    if (entity !== page.entity) logs.push(createRepairLog({ stage, strategy: "consistency", error: `Page ${page.id} referenced missing entity ${page.entity}.`, outcome: `Reassigned page to ${entity}.` }));
    let apiEndpointId = page.apiEndpointId;
    const endpoint = endpointById.get(apiEndpointId);
    if (!endpoint || endpoint.entity !== entity) {
      apiEndpointId = `${slugify(entity)}_list`;
      if (!endpointById.has(apiEndpointId)) {
        const created = { id: apiEndpointId, method: "GET" as const, path: `/api/${slugify(entity)}`, entity, authRequired: true };
        apiEndpoints.push(created);
        endpointById.set(apiEndpointId, created);
      }
      logs.push(createRepairLog({ stage, strategy: "consistency", error: `Page ${page.id} had a missing or mismatched API endpoint.`, outcome: `Linked page to ${apiEndpointId}.` }));
    }
    return { ...page, entity, apiEndpointId };
  });

  const validIntegrations = new Set(integrationRegistry.map((integration) => integration.id));
  const integrationHooks = appSpec.integrationHooks.filter((hook) => {
    const keep = validIntegrations.has(hook.integrationId) && hasIntegrationAction(hook.integrationId, hook.actionId) && entities.has(hook.entity);
    if (!keep) logs.push(createRepairLog({ stage, strategy: "consistency", error: `Invalid integration hook ${hook.id}.`, outcome: "Removed invalid hook instead of retrying blindly." }));
    return keep;
  });

  const workflowStubs = appSpec.workflowStubs.map((workflow) => {
    const entity = entities.has(workflow.entity) ? workflow.entity : firstEntity;
    const validAction = workflow.integrationId && workflow.actionId ? hasIntegrationAction(workflow.integrationId, workflow.actionId) : true;
    if (!validAction) logs.push(createRepairLog({ stage, strategy: "consistency", error: `Workflow ${workflow.id} referenced invalid action.`, outcome: "Removed invalid integration action reference." }));
    return validAction ? { ...workflow, entity } : { ...workflow, entity, integrationId: undefined, actionId: undefined };
  });

  return { value: { ...appSpec, pages, apiEndpoints, integrationHooks, workflowStubs }, logs };
};
