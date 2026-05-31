import { INTEGRATION_REGISTRY } from "@/integrations/registry";
import {
  generateAssumptions,
  reduceScope,
  replaceUnknownIntegrations,
  resolveConflictingAppTypes,
} from "@/repair/strategies/semantic-repair-strategies";
import {
  AppSpec,
  DataSchema,
  Entity,
  IntentOutput,
  Relation,
  RepairLog,
  StageName,
  StageOutput,
  ValidationError,
} from "@/types";
import { SemanticValidationError } from "@/validators/semanticValidationTypes";

export interface RepairResult<T> {
  success: boolean;
  data: T;
  logs: RepairLog[];
}

export interface StructuralRepairResult {
  success: boolean;
  data: StageOutput;
  log: RepairLog;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function entityIndex(path: string): number | undefined {
  const match = path.match(/entities(?:\[|\.)(\d+)(?:\]|\.|$)/);
  return match ? Number.parseInt(match[1], 10) : undefined;
}

function indexedPath(path: string, key: string): number | undefined {
  const match = path.match(new RegExp(`${key}\\[(\\d+)\\]`));
  return match ? Number.parseInt(match[1], 10) : undefined;
}

export class RepairEngine {
  public static repairStructure(rawJson: string, stage: StageName): StructuralRepairResult {
    let normalized = rawJson.trim();
    const stack: string[] = [];
    let inString = false;
    let escaped = false;
    let changed = false;

    for (const char of normalized) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = !inString;
      } else if (!inString && (char === "{" || char === "[")) {
        stack.push(char);
      } else if (!inString && (char === "}" || char === "]")) {
        stack.pop();
      }
    }

    if (inString) {
      normalized += '"';
      changed = true;
    }
    normalized = normalized.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
    normalized = normalized.replace(/,\s*([}\]])/g, "$1");
    while (stack.length > 0) {
      normalized += stack.pop() === "{" ? "}" : "]";
      changed = true;
    }
    normalized = normalized.replace(/,\s*([}\]])/g, "$1");

    try {
      return {
        success: true,
        data: JSON.parse(normalized) as StageOutput,
        log: this.log(stage, "structural_repair", "MALFORMED_JSON", "repaired", { message: changed ? "Recovered truncated JSON and applied terminal defaults." : "Normalized JSON syntax." }),
      };
    } catch (cause) {
      return {
        success: false,
        data: this.defaults(stage),
        log: this.log(stage, "structural_repair", "UNRECOVERABLE_JSON", "failed", { message: cause instanceof Error ? cause.message : "unknown parse failure", fallback: "Returned a stage-specific terminal default without retrying the model." }),
      };
    }
  }

  public static repairFields(data: unknown, errors: ValidationError[], stage: StageName): RepairResult<StageOutput> {
    const candidate = structuredClone(data);
    const root = isRecord(candidate) ? candidate : {};
    const logs: RepairLog[] = [];

    if (stage === "intent") this.repairIntentFields(root, errors, logs);
    if (stage === "schema") this.repairSchemaFields(root, errors, logs);
    if (stage === "appspec") this.repairAppSpecFields(root, errors, logs);

    return { success: logs.some((item) => item.outcome === "repaired"), data: root as StageOutput, logs };
  }

  public static repairConsistency(data: StageOutput, errors: ValidationError[], stage: StageName, context?: { schema?: DataSchema }): RepairResult<StageOutput> {
    const cloned = structuredClone(data);
    const logs: RepairLog[] = [];
    if (stage === "schema") this.repairSchemaConsistency(cloned as DataSchema, errors, logs);
    if (stage === "appspec") this.repairAppSpecConsistency(cloned as AppSpec, errors, logs, context?.schema);
    return { success: logs.some((item) => item.outcome === "repaired"), data: cloned, logs };
  }

  public static repairIntentSemantics(intent: IntentOutput, errors: SemanticValidationError[]): RepairResult<IntentOutput> & { clarification_required?: true } {
    let repairedIntent = structuredClone(intent);
    let clarificationRequired: true | undefined;
    const logs: RepairLog[] = [];

    for (const issue of errors) {
      const result =
        issue.type === "CONFLICTING_APP_TYPES"
          ? resolveConflictingAppTypes(repairedIntent, issue)
          : issue.type === "OVERSCOPED_APPLICATION"
            ? reduceScope(repairedIntent, issue)
            : issue.type === "UNKNOWN_INTEGRATION"
              ? replaceUnknownIntegrations(repairedIntent, issue)
              : generateAssumptions(repairedIntent, issue);
      repairedIntent = result.intent;
      clarificationRequired = result.clarification_required ?? clarificationRequired;
      logs.push(this.log(
        "intent",
        issue.type === "OVERSCOPED_APPLICATION"
          ? "scope_reduction"
          : issue.type === "UNKNOWN_INTEGRATION" || issue.type === "CONFLICTING_APP_TYPES"
            ? "consistency_repair"
            : "assumption_generation",
        issue.type,
        "repaired",
        result.details
      ));
    }

    return {
      success: logs.length > 0,
      data: repairedIntent,
      logs,
      clarification_required: clarificationRequired,
    };
  }

  private static repairIntentFields(root: Record<string, unknown>, errors: ValidationError[], logs: RepairLog[]): void {
    for (const issue of errors) {
      if (!issue.repairable || issue.severity !== "error") continue;
      if (issue.path === "intent.appName") root.appName = "AtlasGen Application";
      if (issue.path === "intent.appType") root.appType = "custom";
      if (issue.path === "intent.features") root.features = ["Core record management"];
      if (issue.path === "intent.entities") root.entities = ["Item"];
      if (issue.path === "intent.integrations_requested") root.integrations_requested = [];
      if (issue.path === "intent.assumptions") root.assumptions = ["Applied deterministic defaults during field repair."];
      logs.push(this.log("intent", "field_repair", issue.code, "repaired", { path: issue.path }));
    }
  }

  private static repairSchemaFields(root: Record<string, unknown>, errors: ValidationError[], logs: RepairLog[]): void {
    if (!Array.isArray(root.entities)) root.entities = [];
    const rawEntities = root.entities;
    const entities = Array.isArray(rawEntities) ? rawEntities.filter(isRecord) : [];

    for (const issue of errors) {
      if (!issue.repairable || issue.severity !== "error") continue;
      const index = entityIndex(issue.path);
      const entity = index === undefined ? undefined : entities[index];
      if (!entity) continue;

      if (issue.path.endsWith(".tenantId")) entity.tenantId = "tenant_default";
      if (!Array.isArray(entity.fields)) entity.fields = [];
      if (!Array.isArray(entity.relations)) entity.relations = [];

      const rawFields = entity.fields;
      const fields = Array.isArray(rawFields) ? rawFields.filter(isRecord) : [];
      if (issue.code === "missing_primary_key" && !fields.some((field) => field.name === "id")) {
        fields.unshift({ name: "id", type: "string", required: true, isPrimaryKey: true });
      }
      if (issue.code === "missing_tenant_field" && !fields.some((field) => field.name === "tenantId")) {
        fields.push({ name: "tenantId", type: "string", required: true });
      }
      entity.fields = fields;
      logs.push(this.log("schema", "field_repair", issue.code, "repaired", { entityIndex: index ?? -1 }));
    }
    root.entities = entities;
  }

  private static repairAppSpecFields(root: Record<string, unknown>, errors: ValidationError[], logs: RepairLog[]): void {
    const defaults: Record<string, unknown[]> = {
      pages: [],
      apiEndpoints: [],
      authRules: [],
      integrationHooks: [],
      workflowStubs: [],
    };
    for (const issue of errors) {
      if (!issue.repairable || issue.severity !== "error") continue;
      for (const [key, value] of Object.entries(defaults)) {
        if (issue.path === `appSpec.${key}` && !Array.isArray(root[key])) {
          root[key] = value;
          logs.push(this.log("appspec", "field_repair", issue.code, "repaired", { initializedField: key }));
        }
      }
    }
  }

  private static repairSchemaConsistency(schema: DataSchema, errors: ValidationError[], logs: RepairLog[]): void {
    const entities = new Map(schema.entities.map((entity) => [entity.name, entity]));
    for (const issue of errors) {
      const sourceIndex = entityIndex(issue.path);
      const relationIndex = indexedPath(issue.path, "relations");
      const source = sourceIndex === undefined ? undefined : schema.entities[sourceIndex];
      const relation = relationIndex === undefined ? undefined : source?.relations[relationIndex];
      if (!source || !relation || relationIndex === undefined) continue;

      if (issue.code === "relation_target_missing") {
        source.relations.splice(relationIndex, 1);
        logs.push(this.log("schema", "consistency_repair", issue.code, "repaired", { action: "removed_missing_relation" }));
      }
      if (issue.code === "relation_inverse_missing") {
        const target = entities.get(relation.targetEntity);
        if (!target) continue;
        target.relations.push({
          type: relation.type === "belongsTo" ? "hasMany" : "belongsTo",
          targetEntity: source.name,
          foreignKey: relation.foreignKey,
        });
        logs.push(this.log("schema", "consistency_repair", issue.code, "repaired", { action: "added_inverse_relation", targetEntity: target.name }));
      }
    }
  }

  private static repairAppSpecConsistency(appSpec: AppSpec, errors: ValidationError[], logs: RepairLog[], schema?: DataSchema): void {
    const fallbackEntity = schema?.entities[0]?.name;
    for (const issue of errors) {
      const pageIndex = indexedPath(issue.path, "pages");
      const workflowIndex = indexedPath(issue.path, "workflowStubs");
      const stepIndex = indexedPath(issue.path, "steps");

      if (issue.code === "page_api_missing" && pageIndex !== undefined) {
        const page = appSpec.pages[pageIndex];
        if (!page) continue;
        appSpec.apiEndpoints.push({ path: `/api/${page.entityContext.toLowerCase()}s`, method: "GET", entityContext: page.entityContext, description: "Added during consistency repair." });
        logs.push(this.log("appspec", "consistency_repair", issue.code, "repaired", { action: "added_get_endpoint", entityContext: page.entityContext }));
      }
      if (issue.code === "page_entity_missing" && pageIndex !== undefined && fallbackEntity) {
        appSpec.pages[pageIndex].entityContext = fallbackEntity;
        logs.push(this.log("appspec", "consistency_repair", issue.code, "repaired", { action: "aligned_page_entity", entityContext: fallbackEntity }));
      }
      if (issue.code === "workflow_entity_missing" && workflowIndex !== undefined && fallbackEntity) {
        const workflow = appSpec.workflowStubs[workflowIndex];
        if (stepIndex === undefined) workflow.triggerEntity = fallbackEntity;
        else workflow.steps[stepIndex].target = fallbackEntity;
        logs.push(this.log("appspec", "consistency_repair", issue.code, "repaired", { action: "aligned_workflow_entity", entityContext: fallbackEntity }));
      }
      if ((issue.code === "integration_missing" || issue.code === "integration_action_missing")) {
        this.repairIntegrationReference(appSpec, issue, logs);
      }
    }
  }

  private static repairIntegrationReference(appSpec: AppSpec, issue: ValidationError, logs: RepairLog[]): void {
    const hookIndex = indexedPath(issue.path, "integrationHooks");
    const workflowIndex = indexedPath(issue.path, "workflowStubs");
    const stepIndex = indexedPath(issue.path, "steps");
    const hook = hookIndex === undefined ? undefined : appSpec.integrationHooks[hookIndex];
    const step = workflowIndex === undefined || stepIndex === undefined ? undefined : appSpec.workflowStubs[workflowIndex]?.steps[stepIndex];
    const integrationId = hook?.integrationId ?? step?.target ?? "slack";
    const registry = INTEGRATION_REGISTRY[integrationId.toLowerCase()] ?? INTEGRATION_REGISTRY.slack;
    if (hook) {
      hook.integrationId = registry.id;
      hook.action = registry.actions.includes(hook.action) ? hook.action : registry.actions[0];
    }
    if (step?.type === "integration") {
      step.target = registry.id;
      step.action = registry.actions.includes(step.action) ? step.action : registry.actions[0];
    }
    logs.push(this.log("appspec", "consistency_repair", issue.code, "repaired", { action: "aligned_integration", integrationId: registry.id }));
  }

  private static defaults(stage: StageName): StageOutput {
    if (stage === "intent") return { appName: "AtlasGen Application", appType: "custom", features: ["Core record management"], entities: ["Item"], integrations_requested: [], assumptions: ["Applied terminal intent defaults."] };
    if (stage === "schema") return { entities: [this.defaultEntity()] };
    return { pages: [{ name: "Items", path: "/items", entityContext: "Item", components: ["ItemList"] }], apiEndpoints: [{ path: "/api/items", method: "GET", entityContext: "Item" }], authRules: [], integrationHooks: [], workflowStubs: [] };
  }

  private static defaultEntity(): Entity {
    return { name: "Item", tableName: "items", tenantId: "tenant_default", fields: [{ name: "id", type: "string", required: true, isPrimaryKey: true }, { name: "tenantId", type: "string", required: true }], relations: [] };
  }

  private static log(stage: StageName, strategy: RepairLog["strategy"], errorType: string, outcome: string, details: RepairLog["details"]): RepairLog {
    return { timestamp: new Date().toISOString(), stage, strategy, errorType, outcome, details };
  }
}
