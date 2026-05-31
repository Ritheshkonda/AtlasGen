import { ValidationError } from "@/types";

export interface IntegrationRegistryItem {
  id: string;
  displayName: string;
  authType: "oauth2" | "apikey" | "none";
  triggers: string[];
  actions: string[];
}

export const INTEGRATION_REGISTRY: Record<string, IntegrationRegistryItem> = {
  slack: {
    id: "slack",
    displayName: "Slack",
    authType: "oauth2",
    triggers: ["on_message", "on_channel_join", "on_reaction_added"],
    actions: ["send_message", "create_channel", "invite_user"],
  },
  whatsapp: {
    id: "whatsapp",
    displayName: "WhatsApp Business",
    authType: "apikey",
    triggers: ["on_receive_text", "on_receive_delivery_receipt"],
    actions: ["send_text", "send_template", "send_media"],
  },
  gmail: {
    id: "gmail",
    displayName: "Gmail / Google Workspace",
    authType: "oauth2",
    triggers: ["on_email_received", "on_thread_updated"],
    actions: ["send_email", "create_draft", "label_email"],
  },
  stripe: {
    id: "stripe",
    displayName: "Stripe Payments",
    authType: "apikey",
    triggers: [
      "on_payment_success",
      "on_payment_failed",
      "on_subscription_created",
      "on_subscription_deleted",
    ],
    actions: [
      "create_charge",
      "refund_charge",
      "create_customer",
      "create_subscription",
    ],
  },
  webhook: {
    id: "webhook",
    displayName: "Custom Outgoing Webhooks",
    authType: "none",
    triggers: ["on_webhook_call"],
    actions: ["trigger_callback", "dispatch_payload"],
  },
};

/**
 * Validates whether an integration reference is supported.
 * Fails if:
 * 1. Integration is missing.
 * 2. Action is missing.
 */
export function validateIntegrationReference(
  integrationId: string,
  action: string,
  pathPrefix: string
): ValidationError[] {
  const errors: ValidationError[] = [];
  const lowercaseId = integrationId.toLowerCase();
  const registryItem = INTEGRATION_REGISTRY[lowercaseId];

  if (!registryItem) {
    errors.push({
      stage: "appspec",
      code: "integration_missing",
      path: `${pathPrefix}.integrationId`,
      message: `Integration '${integrationId}' is not registered in the system. Registered items: ${Object.keys(
        INTEGRATION_REGISTRY
      ).join(", ")}`,
      severity: "error",
      repairable: true,
    });
    return errors;
  }

  if (!registryItem.actions.includes(action)) {
    errors.push({
      stage: "appspec",
      code: "integration_action_missing",
      path: `${pathPrefix}.action`,
      message: `Action '${action}' does not exist on integration '${registryItem.displayName}'. Supported actions: ${registryItem.actions.join(
        ", "
      )}`,
      severity: "error",
      repairable: true,
    });
  }

  return errors;
}
