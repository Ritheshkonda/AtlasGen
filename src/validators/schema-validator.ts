import { validateIntegrationReference } from "@/integrations/registry";
import {
  AppSpecSchema,
  DataSchema,
  DataSchemaSchema,
  IntentOutputSchema,
  StageName,
  ValidationError,
  ValidationErrorCode,
  ValidationResult,
} from "@/types";
import { z } from "zod";

function error(
  stage: StageName,
  code: ValidationErrorCode,
  path: string,
  message: string,
  repairable = true,
  severity: ValidationError["severity"] = "error"
): ValidationError {
  return { stage, code, path, message, severity, repairable };
}

function zodErrors(stage: StageName, prefix: string, zodError: z.ZodError): ValidationError[] {
  return zodError.errors.map((issue) => {
    const path = [prefix, ...issue.path.map(String)].filter(Boolean).join(".");
    const code: ValidationErrorCode =
      issue.code === "invalid_type" && issue.received === "undefined"
        ? "missing_required_field"
        : issue.code === "invalid_type"
          ? "invalid_field_type"
          : "invalid_structure";
    return error(stage, code, path, issue.message);
  });
}

function hasInverseRelation(sourceName: string, relation: DataSchema["entities"][number]["relations"][number], target: DataSchema["entities"][number]): boolean {
  return target.relations.some((candidate) => {
    if (candidate.targetEntity !== sourceName || candidate.foreignKey !== relation.foreignKey) return false;
    if (relation.type === "belongsTo") return candidate.type === "hasMany" || candidate.type === "hasOne";
    return candidate.type === "belongsTo";
  });
}

export class SchemaValidator {
  public static validateIntent(intent: unknown): ValidationResult {
    const parsed = IntentOutputSchema.safeParse(intent);
    if (!parsed.success) return { valid: false, errors: zodErrors("intent", "intent", parsed.error) };

    const errors: ValidationError[] = [];
    if (parsed.data.features.length === 0) {
      errors.push(error("intent", "missing_required_field", "intent.features", "Features list is empty. Vague prompts require assumptions.", true, "warning"));
    }
    if (parsed.data.entities.length === 0) {
      errors.push(error("intent", "missing_entity", "intent.entities", "Entities list is empty. App requires at least one database entity."));
    }
    return this.result(errors);
  }

  public static validateSchema(schema: unknown): ValidationResult {
    const parsed = DataSchemaSchema.safeParse(schema);
    if (!parsed.success) return { valid: false, errors: zodErrors("schema", "schema", parsed.error) };

    const errors: ValidationError[] = [];
    const entityMap = new Map(parsed.data.entities.map((entity) => [entity.name, entity]));
    const seenNames = new Set<string>();

    parsed.data.entities.forEach((entity, entityIndex) => {
      const path = `schema.entities[${entityIndex}]`;
      if (seenNames.has(entity.name)) {
        errors.push(error("schema", "duplicate_entity", `${path}.name`, `Entity '${entity.name}' is declared more than once.`, false));
      }
      seenNames.add(entity.name);

      const idField = entity.fields.find((field) => field.name === "id");
      if (!idField || idField.type !== "string" || idField.required !== true || idField.isPrimaryKey !== true) {
        errors.push(error("schema", "missing_primary_key", `${path}.fields`, `Entity '${entity.name}' requires a string primary key field named 'id'.`));
      }

      const tenantField = entity.fields.find((field) => field.name === "tenantId");
      if (!tenantField || tenantField.type !== "string" || tenantField.required !== true) {
        errors.push(error("schema", "missing_tenant_field", `${path}.fields`, `Entity '${entity.name}' requires a required string field named 'tenantId'.`));
      }

      entity.relations.forEach((relation, relationIndex) => {
        const relationPath = `${path}.relations[${relationIndex}]`;
        const target = entityMap.get(relation.targetEntity);
        if (!target) {
          errors.push(error("schema", "relation_target_missing", `${relationPath}.targetEntity`, `Relation target '${relation.targetEntity}' from '${entity.name}' does not exist.`));
        } else if (!hasInverseRelation(entity.name, relation, target)) {
          errors.push(error("schema", "relation_inverse_missing", relationPath, `Relation '${entity.name}.${relation.type}' requires an inverse relation on '${target.name}' with foreign key '${relation.foreignKey}'.`));
        }
      });
    });

    return this.result(errors);
  }

  public static validateAppSpec(appSpec: unknown, schema?: DataSchema): ValidationResult {
    const parsed = AppSpecSchema.safeParse(appSpec);
    if (!parsed.success) return { valid: false, errors: zodErrors("appspec", "appSpec", parsed.error) };

    const errors: ValidationError[] = [];
    const entities = new Set(schema?.entities.map((entity) => entity.name) ?? []);

    parsed.data.pages.forEach((page, index) => {
      const path = `appSpec.pages[${index}]`;
      if (schema && !entities.has(page.entityContext)) {
        errors.push(error("appspec", "page_entity_missing", `${path}.entityContext`, `Page '${page.name}' references missing entity '${page.entityContext}'.`));
      }
      if (!parsed.data.apiEndpoints.some((endpoint) => endpoint.entityContext === page.entityContext)) {
        errors.push(error("appspec", "page_api_missing", `${path}.entityContext`, `Page '${page.name}' requires an API endpoint for '${page.entityContext}'.`));
      }
    });

    parsed.data.authRules.forEach((rule, index) => {
      if (schema && !entities.has(rule.entityContext)) {
        errors.push(error("appspec", "auth_entity_missing", `appSpec.authRules[${index}].entityContext`, `Auth rule references missing entity '${rule.entityContext}'.`));
      }
    });

    parsed.data.integrationHooks.forEach((hook, index) => {
      errors.push(...validateIntegrationReference(hook.integrationId, hook.action, `appSpec.integrationHooks[${index}]`));
    });

    parsed.data.workflowStubs.forEach((workflow, workflowIndex) => {
      const path = `appSpec.workflowStubs[${workflowIndex}]`;
      if (schema && !entities.has(workflow.triggerEntity)) {
        errors.push(error("appspec", "workflow_entity_missing", `${path}.triggerEntity`, `Workflow trigger entity '${workflow.triggerEntity}' does not exist in the DataSchema.`));
      }
      workflow.steps.forEach((step, stepIndex) => {
        const stepPath = `${path}.steps[${stepIndex}]`;
        if (step.type === "database" && schema && !entities.has(step.target)) {
          errors.push(error("appspec", "workflow_entity_missing", `${stepPath}.target`, `Workflow database target '${step.target}' does not exist in the DataSchema.`));
        }
        if (step.type === "integration") {
          errors.push(...validateIntegrationReference(step.target, step.action, stepPath));
        }
      });
    });

    return this.result(errors);
  }

  private static result(errors: ValidationError[]): ValidationResult {
    return { valid: !errors.some((item) => item.severity === "error"), errors };
  }
}
