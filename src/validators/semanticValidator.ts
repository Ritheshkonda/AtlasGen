import { INTEGRATION_REGISTRY } from "@/integrations/registry";
import { KNOWN_UNSUPPORTED_INTEGRATIONS } from "@/integrations/integration-replacement-map";
import { IntentOutput } from "@/types";
import {
  SemanticAppTypeCandidate,
  SemanticValidationError,
  SemanticValidationResult,
} from "@/validators/semanticValidationTypes";

const VAGUE_PROMPTS = new Set(["an app", "build something", "create software", "make an app", "build an app"]);
const AMBIGUOUS_PATTERNS = [/\bsomething like\b/i, /\bsimilar to\b/i, /\bmake (?:it |a )?smart\b/i];
const AI_PATTERN = /\b(smart|intelligent|ai-powered|ai powered|automated)\b/i;
const OVERSCOPE_FEATURES = ["payments", "chat", "analytics", "marketplace", "mobile app", "ai assistant", "video calls", "file uploads"];
const OVERSCOPE_THRESHOLD = 5;

const APP_TYPE_PATTERNS: ReadonlyArray<{ type: SemanticAppTypeCandidate; pattern: RegExp }> = [
  { type: "crm", pattern: /\b(crm|salesforce|customer relationship)\b/i },
  { type: "project_management", pattern: /\b(project manager|project management|project tracker)\b/i },
  { type: "invoicing", pattern: /\b(invoice|invoicing|billing)\b/i },
  { type: "ecommerce", pattern: /\b(ecommerce|e-commerce|online store|shop)\b/i },
  { type: "hr_tool", pattern: /\b(hr tool|human resources|employee management)\b/i },
  { type: "inventory", pattern: /\b(inventory|warehouse|stock management)\b/i },
];

function issue(type: SemanticValidationError["type"], severity: SemanticValidationError["severity"], message: string, details: SemanticValidationError["details"]): SemanticValidationError {
  return { type, severity, message, details, repairable: true };
}

function uniqueMatches(prompt: string, values: readonly string[]): string[] {
  const lowerPrompt = prompt.toLowerCase();
  return values.filter((value) => lowerPrompt.includes(value));
}

export class SemanticValidator {
  public static validateIntent(prompt: string, intent: IntentOutput): SemanticValidationResult {
    const normalized = prompt.trim().toLowerCase().replace(/[.!?]+$/, "");
    const errors: SemanticValidationError[] = [];
    const detectedAppTypes = APP_TYPE_PATTERNS.filter(({ pattern }) => pattern.test(prompt)).map(({ type }) => type);
    const scopeFeatures = uniqueMatches(prompt, OVERSCOPE_FEATURES);
    const unsupportedIntegrations = uniqueMatches(prompt, KNOWN_UNSUPPORTED_INTEGRATIONS);
    const intentUnknownIntegrations = intent.integrations_requested.filter((id) => !INTEGRATION_REGISTRY[id.toLowerCase()]);
    const allUnknownIntegrations = Array.from(new Set([...unsupportedIntegrations, ...intentUnknownIntegrations]));

    if (VAGUE_PROMPTS.has(normalized) || normalized.split(/\s+/).length < 3) {
      errors.push(issue("INSUFFICIENT_CONTEXT", "warning", "The request does not provide enough context to define a reliable application scope.", { prompt }));
    }
    if (AMBIGUOUS_PATTERNS.some((pattern) => pattern.test(prompt))) {
      errors.push(issue("AMBIGUOUS_REQUIREMENT", "warning", "The request relies on an analogy or undefined qualifier that needs explicit assumptions.", { prompt }));
    }
    if (detectedAppTypes.length > 1) {
      errors.push(issue("CONFLICTING_APP_TYPES", "warning", "The request combines multiple application categories. A primary category must be selected.", { detectedAppTypes }));
    }
    if (scopeFeatures.length > OVERSCOPE_THRESHOLD) {
      errors.push(issue("OVERSCOPED_APPLICATION", "warning", `The request includes ${scopeFeatures.length} enterprise capabilities, exceeding the MVP threshold of ${OVERSCOPE_THRESHOLD}.`, { features: scopeFeatures, threshold: OVERSCOPE_THRESHOLD }));
    }
    if (allUnknownIntegrations.length > 0) {
      errors.push(issue("UNKNOWN_INTEGRATION", "warning", "The request includes integrations that are not available in the AtlasGen registry.", { integrations: allUnknownIntegrations }));
    }
    if (AI_PATTERN.test(prompt)) {
      errors.push(issue("UNDEFINED_AI_BEHAVIOR", "warning", "The request uses AI-oriented language without defining the expected intelligent behavior.", { prompt }));
    }

    return { valid: errors.length === 0, errors };
  }
}
