import { z } from "zod";

export const AppTypeSchema = z.enum([
  "crm",
  "project_management",
  "ecommerce",
  "hr_tool",
  "inventory",
  "content_platform",
  "analytics",
  "custom"
]);

export type AppType = z.infer<typeof AppTypeSchema>;

export const IntentInputSchema = z.object({ prompt: z.string().min(1) });
export type IntentInput = z.infer<typeof IntentInputSchema>;

export const IntentOutputSchema = z.object({
  appName: z.string().min(1),
  appType: AppTypeSchema,
  features: z.array(z.string().min(1)),
  entities: z.array(z.string().min(1)),
  integrations_requested: z.array(z.string().min(1)),
  assumptions: z.array(z.string().min(1)),
  clarification_required: z.boolean().optional()
});

export type IntentOutput = z.infer<typeof IntentOutputSchema>;
