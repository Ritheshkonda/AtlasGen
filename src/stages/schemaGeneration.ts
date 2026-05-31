import type { StageResult } from "@/types/common";
import type { IntentOutput } from "@/types/intent";
import type { DataSchemaOutput, EntitySchema } from "@/types/schema";
import { aiGateway } from "@/gateway/aiGateway";
import { slugify } from "@/lib/json";
import { validateDataSchema } from "@/validators/schemaValidator";
import { repairDataSchema } from "@/repair/engine";

const defaultFields = [
  { name: "tenantId", type: "string" as const, required: true, unique: false },
  { name: "id", type: "string" as const, required: true, unique: true },
  { name: "name", type: "string" as const, required: true, unique: false },
  { name: "description", type: "string" as const, required: false, unique: false },
  { name: "createdAt", type: "date" as const, required: true, unique: false },
  { name: "updatedAt", type: "date" as const, required: true, unique: false }
];

export const runSchemaGeneration = async (intent: IntentOutput): Promise<StageResult<DataSchemaOutput>> => {
  const started = Date.now();
  const entities: EntitySchema[] = intent.entities.map((entityName) => ({
    name: entityName,
    tableName: slugify(entityName),
    fields: defaultFields,
    relations: []
  }));
  if (entities.length > 1) {
    const parent = entities[0];
    entities.slice(1).forEach((child) => {
      parent.relations.push({ name: slugify(`${child.name}s`), type: "hasMany", targetEntity: child.name, inverse: slugify(parent.name) });
      child.relations.push({ name: slugify(parent.name), type: "belongsTo", targetEntity: parent.name, inverse: slugify(`${child.name}s`) });
    });
  }
  const generated: DataSchemaOutput = { entities };
  const response = await aiGateway.generate("schemaGeneration", intent.appName, generated);
  const validation = validateDataSchema(response.content);
  if (validation.valid) return { output: response.content as DataSchemaOutput, validation, repairLogs: [], latency: Date.now() - started };
  const repaired = repairDataSchema(response.content, intent);
  return { output: repaired.value, validation: repaired.validation, repairLogs: repaired.logs, latency: Date.now() - started };
};
