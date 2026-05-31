import { z } from "zod";

export const PageSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  route: z.string().startsWith("/"),
  entity: z.string().min(1),
  apiEndpointId: z.string().min(1)
});
export type Page = z.infer<typeof PageSchema>;

export const ApiEndpointSchema = z.object({
  id: z.string().min(1),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  path: z.string().startsWith("/"),
  entity: z.string().min(1),
  authRequired: z.boolean()
});
export type ApiEndpoint = z.infer<typeof ApiEndpointSchema>;

export const AuthRuleSchema = z.object({
  id: z.string().min(1),
  entity: z.string().min(1),
  roles: z.array(z.string().min(1)),
  permissions: z.array(z.enum(["create", "read", "update", "delete", "admin"]))
});
export type AuthRule = z.infer<typeof AuthRuleSchema>;

export const IntegrationHookSchema = z.object({
  id: z.string().min(1),
  integrationId: z.string().min(1),
  triggerId: z.string().min(1).optional(),
  actionId: z.string().min(1),
  entity: z.string().min(1)
});
export type IntegrationHook = z.infer<typeof IntegrationHookSchema>;

export const WorkflowStubSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  entity: z.string().min(1),
  integrationId: z.string().min(1).optional(),
  actionId: z.string().min(1).optional(),
  steps: z.array(z.string().min(1))
});
export type WorkflowStub = z.infer<typeof WorkflowStubSchema>;

export const AppSpecOutputSchema = z.object({
  pages: z.array(PageSchema),
  apiEndpoints: z.array(ApiEndpointSchema),
  authRules: z.array(AuthRuleSchema),
  integrationHooks: z.array(IntegrationHookSchema),
  workflowStubs: z.array(WorkflowStubSchema)
});
export type AppSpecOutput = z.infer<typeof AppSpecOutputSchema>;
