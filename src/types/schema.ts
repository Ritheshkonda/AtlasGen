import { z } from "zod";

export const FieldTypeSchema = z.enum(["string", "number", "boolean", "date", "json", "currency", "email"]);
export type FieldType = z.infer<typeof FieldTypeSchema>;

export const FieldSchema = z.object({
  name: z.string().min(1),
  type: FieldTypeSchema,
  required: z.boolean(),
  unique: z.boolean().default(false)
});
export type Field = z.infer<typeof FieldSchema>;

export const RelationTypeSchema = z.enum(["hasOne", "hasMany", "belongsTo"]);
export type RelationType = z.infer<typeof RelationTypeSchema>;

export const RelationSchema = z.object({
  name: z.string().min(1),
  type: RelationTypeSchema,
  targetEntity: z.string().min(1),
  inverse: z.string().min(1)
});
export type Relation = z.infer<typeof RelationSchema>;

export const EntitySchemaSchema = z.object({
  name: z.string().min(1),
  tableName: z.string().min(1),
  fields: z.array(FieldSchema),
  relations: z.array(RelationSchema)
});
export type EntitySchema = z.infer<typeof EntitySchemaSchema>;

export const DataSchemaOutputSchema = z.object({ entities: z.array(EntitySchemaSchema).min(1) });
export type DataSchemaOutput = z.infer<typeof DataSchemaOutputSchema>;
