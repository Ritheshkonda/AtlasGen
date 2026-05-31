import type { StageName } from "@/types/common";
import { gatewayRoutingConfig, type GatewayRoutingConfig } from "./config";
import { providers, type GenerateResponse } from "./providers";

export class AiGateway {
  constructor(private readonly config: GatewayRoutingConfig = gatewayRoutingConfig) {}

  async generate(stage: StageName, prompt: string, context: Record<string, unknown>): Promise<GenerateResponse> {
    const route = this.config[stage];
    const primary = providers[route.primary];
    const fallback = providers[route.fallback];
    const response = await primary.generate({ stage, prompt, context });
    if (response.content === undefined || response.content === null) {
      return fallback.generate({ stage, prompt, context });
    }
    return response;
  }
}

export const aiGateway = new AiGateway();
