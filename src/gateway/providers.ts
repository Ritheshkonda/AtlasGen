import type { StageName } from "@/types/common";
import type { ProviderId } from "./config";

export interface GenerateRequest {
  stage: StageName;
  prompt: string;
  context: Record<string, unknown>;
}

export interface GenerateResponse {
  content: unknown;
  provider: ProviderId;
  tokenCost: number;
}

export interface AiProvider {
  id: ProviderId;
  generate(request: GenerateRequest): Promise<GenerateResponse>;
}

const createProvider = (id: ProviderId): AiProvider => ({
  id,
  async generate(request) {
    return { content: request.context, provider: id, tokenCost: Math.max(0.001, request.prompt.length * 0.000002) };
  }
});

export const providers: Record<ProviderId, AiProvider> = {
  openai: createProvider("openai"),
  groq: createProvider("groq"),
  gemini: createProvider("gemini"),
  anthropic: createProvider("anthropic"),
  deepseek: createProvider("deepseek"),
  openrouter: createProvider("openrouter"),
  mistral: createProvider("mistral")
};
