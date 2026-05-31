import { DataSchemaOutputSchema } from "@/types/schema";
import type { DataSchemaOutput, EntitySchema, Relation } from "@/types/schema";
import type { ValidationError, ValidationResult } from "@/types/common";
import { fail, mergeResults, validateWithZod } from "./core";

const hasTenantId = (entity: EntitySchema): boolean => entity.fields.some((field) => field.name === "tenantId" && field.type === "string");

const inverseTypeValid = (relation: Relation, inverse: Relation): boolean => {
  if (relation.type === "hasMany") return inverse.type === "belongsTo";
  if (relation.type === "belongsTo") return inverse.type === "hasMany" || inverse.type === "hasOne";
  return inverse.type === "belongsTo" || inverse.type === "hasOne";
};

export const validateDataSchema = (value: unknown): ValidationResult => {
  const structure = validateWithZod(DataSchemaOutputSchema, value, "dataSchema");
  if (!structure.valid) return structure;
  const schema = value as DataSchemaOutput;
  const errors: ValidationError[] = [];
  const names = new Set(schema.entities.map((entity) => entity.name));
  const tableNames = new Set<string>();

  schema.entities.forEach((entity) => {
    if (!hasTenantId(entity)) {
      errors.push({ code: "missing_tenant_id", message: `Entity ${entity.name} must include tenantId string field.`, path: `dataSchema.entities.${entity.name}.fields`, severity: "error" });
    }
    if (tableNames.has(entity.tableName)) {
      errors.push({ code: "duplicate_table", message: `Duplicate table name ${entity.tableName}.`, path: `dataSchema.entities.${entity.name}.tableName`, severity: "error" });
    }
    tableNames.add(entity.tableName);
    entity.relations.forEach((relation) => {
      const target = schema.entities.find((candidate) => candidate.name === relation.targetEntity);
      if (!target || !names.has(relation.targetEntity)) {
        errors.push({ code: "missing_relation_target", message: `Relation ${relation.name} targets missing entity ${relation.targetEntity}.`, path: `dataSchema.entities.${entity.name}.relations.${relation.name}`, severity: "error" });
        return;
      }
      const inverse = target.relations.find((candidate) => candidate.name === relation.inverse && candidate.targetEntity === entity.name);
      if (!inverse) {
        errors.push({ code: "missing_inverse_relation", message: `Relation ${entity.name}.${relation.name} lacks inverse ${relation.inverse}.`, path: `dataSchema.entities.${entity.name}.relations.${relation.name}.inverse`, severity: "error" });
        return;
      }
      if (!inverseTypeValid(relation, inverse)) {
        errors.push({ code: "invalid_inverse_relation", message: `Relation ${entity.name}.${relation.name} inverse type is inconsistent.`, path: `dataSchema.entities.${entity.name}.relations.${relation.name}.type`, severity: "error" });
      }
    });
  });

  return mergeResults([structure, fail(errors)]);
};
