import type { StageResult } from "@/types/common";
import type { IntentInput, IntentOutput } from "@/types/intent";
import { aiGateway } from "@/gateway/aiGateway";
import { validateIntent } from "@/validators/intentValidator";
import { repairIntent } from "@/repair/engine";

const detectAppType = (prompt: string): IntentOutput["appType"] => {
  const text = prompt.toLowerCase();
  if (text.includes("crm") || text.includes("lead") || text.includes("customer")) return "crm";
  if (text.includes("project") || text.includes("task")) return "project_management";
  if (text.includes("shop") || text.includes("ecommerce") || text.includes("store")) return "ecommerce";
  if (text.includes("hr") || text.includes("employee") || text.includes("recruit")) return "hr_tool";
  if (text.includes("inventory") || text.includes("warehouse") || text.includes("stock")) return "inventory";
  if (text.includes("content") || text.includes("notion") || text.includes("publish")) return "content_platform";
  if (text.includes("analytics") || text.includes("dashboard")) return "analytics";
  return "custom";
};

const entitiesFor = (type: IntentOutput["appType"], prompt: string): string[] => {
  const base: Record<IntentOutput["appType"], string[]> = {
    crm: ["Account", "Contact", "Deal", "Activity"],
    project_management: ["Project", "Task", "Milestone", "Comment"],
    ecommerce: ["Product", "Customer", "Order", "Payment"],
    hr_tool: ["Employee", "Candidate", "Role", "Review"],
    inventory: ["Item", "Warehouse", "StockMovement", "Supplier"],
    content_platform: ["Workspace", "Document", "Collection", "Comment"],
    analytics: ["Dashboard", "Metric", "Report", "DataSource"],
    custom: ["Workspace", "User", "Item"]
  };
  const entities = new Set(base[type]);
  if (prompt.toLowerCase().includes("invoice")) entities.add("Invoice");
  if (prompt.toLowerCase().includes("doctor")) entities.add("Patient");
  return [...entities];
};

const integrationsFor = (prompt: string): string[] => {
  const text = prompt.toLowerCase();
  return [
    text.includes("slack") ? "slack" : "",
    text.includes("whatsapp") ? "whatsapp" : "",
    text.includes("gmail") || text.includes("email") ? "gmail" : "",
    text.includes("stripe") || text.includes("invoice") || text.includes("payment") ? "stripe" : "",
    text.includes("webhook") ? "webhook" : ""
  ].filter(Boolean);
};

export const runIntentExtraction = async (input: IntentInput): Promise<StageResult<IntentOutput>> => {
  const started = Date.now();
  const appType = detectAppType(input.prompt);
  const vague = input.prompt.trim().split(/\s+/u).length <= 3;
  const generated: IntentOutput = {
    appName: `${input.prompt.trim().slice(0, 36) || "Generated"} App`,
    appType,
    features: ["Dashboard", "CRUD management", "Role-based access", "Audit trail"],
    entities: entitiesFor(appType, input.prompt),
    integrations_requested: integrationsFor(input.prompt),
    assumptions: vague ? ["The prompt was vague, so a multi-tenant CRUD application with dashboard and reporting was assumed."] : ["The app should be multi-tenant and production ready."],
    clarification_required: false
  };
  const response = await aiGateway.generate("intentExtraction", input.prompt, generated);
  const validation = validateIntent(response.content);
  if (validation.valid) return { output: response.content as IntentOutput, validation, repairLogs: [], latency: Date.now() - started };
  const repaired = repairIntent(response.content);
  return { output: repaired.value, validation: repaired.validation, repairLogs: repaired.logs, latency: Date.now() - started };
};
