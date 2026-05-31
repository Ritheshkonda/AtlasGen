import { INTEGRATION_REPLACEMENT_MAP } from "@/integrations/integration-replacement-map";
import { AppType, IntentOutput, JsonValue } from "@/types";
import { SemanticAppTypeCandidate, SemanticValidationError } from "@/validators/semanticValidationTypes";

export interface StrategyResult {
  intent: IntentOutput;
  details: Record<string, JsonValue>;
  clarification_required?: true;
}

const AMBIGUITY_ASSUMPTIONS = ["Document collaboration", "Rich text notes", "Knowledge base organization"];
const VAGUE_ASSUMPTIONS = ["Multi-tenant workspace", "Role-based access", "Core record management"];
const AI_ASSUMPTIONS = ["AI task prioritization", "Deadline prediction", "Automatic summaries"];
const OVERSCOPE_FEATURES = ["payments", "chat", "analytics", "marketplace", "mobile app", "ai assistant", "video calls", "file uploads"];
const MVP_KEEP_COUNT = 4;

function appendUnique(values: string[], additions: string[]): string[] {
  return Array.from(new Set([...values, ...additions]));
}

function asStrings(value: JsonValue | undefined): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function selectedAppType(candidates: SemanticAppTypeCandidate[], current: AppType): AppType {
  const supported = candidates.filter((candidate): candidate is AppType => candidate !== "invoicing");
  return supported[0] ?? current;
}

export function generateAssumptions(intent: IntentOutput, error: SemanticValidationError): StrategyResult {
  const assumptions =
    error.type === "UNDEFINED_AI_BEHAVIOR"
      ? AI_ASSUMPTIONS
      : error.type === "INSUFFICIENT_CONTEXT"
        ? VAGUE_ASSUMPTIONS
        : AMBIGUITY_ASSUMPTIONS;
  return {
    intent: { ...intent, assumptions: appendUnique(intent.assumptions, assumptions) },
    clarification_required: error.type === "INSUFFICIENT_CONTEXT" ? true : undefined,
    details: { assumptions, clarification_required: error.type === "INSUFFICIENT_CONTEXT" },
  };
}

export function resolveConflictingAppTypes(intent: IntentOutput, error: SemanticValidationError): StrategyResult {
  const candidates = asStrings(error.details.detectedAppTypes) as SemanticAppTypeCandidate[];
  const selectedType = selectedAppType(candidates, intent.appType);
  const discardedTypes = candidates.filter((candidate) => candidate !== selectedType);
  return {
    intent: {
      ...intent,
      appType: selectedType,
      assumptions: appendUnique(intent.assumptions, [`Selected '${selectedType}' as the primary app type; deferred: ${discardedTypes.join(", ")}.`]),
    },
    details: { selectedType, discardedTypes },
  };
}

export function reduceScope(intent: IntentOutput, error: SemanticValidationError): StrategyResult {
  const detected = asStrings(error.details.features);
  const keptFeatures = detected.slice(0, MVP_KEEP_COUNT);
  const removedFeatures = detected.slice(MVP_KEEP_COUNT);
  const retainedIntentFeatures = intent.features.filter((feature) => !removedFeatures.some((removed) => feature.toLowerCase().includes(removed)));
  return {
    intent: {
      ...intent,
      features: retainedIntentFeatures.length > 0 ? retainedIntentFeatures : keptFeatures,
      assumptions: appendUnique(intent.assumptions, removedFeatures.map((feature) => `Deferred '${feature}' from MVP scope.`)),
    },
    details: { keptFeatures, removedFeatures },
  };
}

export function replaceUnknownIntegrations(intent: IntentOutput, error: SemanticValidationError): StrategyResult {
  const unsupported = asStrings(error.details.integrations);
  const replacements = unsupported.map((integration) => ({
    from: integration,
    to: INTEGRATION_REPLACEMENT_MAP[integration.toLowerCase()] ?? "webhook",
  }));
  const unsupportedSet = new Set(unsupported.map((integration) => integration.toLowerCase()));
  const supportedExisting = intent.integrations_requested.filter((integration) => !unsupportedSet.has(integration.toLowerCase()));
  return {
    intent: {
      ...intent,
      integrations_requested: appendUnique(supportedExisting, replacements.map(({ to }) => to)),
      assumptions: appendUnique(intent.assumptions, replacements.map(({ from, to }) => `Mapped unsupported integration '${from}' to '${to}'.`)),
    },
    details: { replacements },
  };
}
