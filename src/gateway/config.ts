import { z } from "zod";

export const ProviderIdSchema = z.enum(["openai", "groq", "gemini", "anthropic", "deepseek", "openrouter", "mistral"]);
export type ProviderId = z.infer<typeof ProviderIdSchema>;

export const StageRouteSchema = z.object({ primary: ProviderIdSchema, fallback: ProviderIdSchema });
export const GatewayRoutingConfigSchema = z.object({
  intentExtraction: StageRouteSchema,
  schemaGeneration: StageRouteSchema,
  appSpecGeneration: StageRouteSchema
});

export type GatewayRoutingConfig = z.infer<typeof GatewayRoutingConfigSchema>;

export const gatewayRoutingConfig: GatewayRoutingConfig = {
  intentExtraction: { primary: "groq", fallback: "openai" },
  schemaGeneration: { primary: "openai", fallback: "gemini" },
  appSpecGeneration: { primary: "anthropic", fallback: "mistral" }
};
