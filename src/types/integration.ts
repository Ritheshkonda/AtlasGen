import { z } from "zod";

export const AuthTypeSchema = z.enum(["oauth2", "api_key", "webhook_secret", "none"]);
export type AuthType = z.infer<typeof AuthTypeSchema>;

export const IntegrationTriggerSchema = z.object({ id: z.string(), displayName: z.string(), payloadSchema: z.record(z.string()) });
export type IntegrationTrigger = z.infer<typeof IntegrationTriggerSchema>;

export const IntegrationActionSchema = z.object({ id: z.string(), displayName: z.string(), inputSchema: z.record(z.string()) });
export type IntegrationAction = z.infer<typeof IntegrationActionSchema>;

export const IntegrationDefinitionSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  authType: AuthTypeSchema,
  triggers: z.array(IntegrationTriggerSchema),
  actions: z.array(IntegrationActionSchema)
});
export type IntegrationDefinition = z.infer<typeof IntegrationDefinitionSchema>;
