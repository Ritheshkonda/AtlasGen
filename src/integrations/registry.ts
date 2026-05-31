import type { IntegrationDefinition } from "@/types/integration";

export const integrationRegistry: IntegrationDefinition[] = [
  {
    id: "slack",
    displayName: "Slack",
    authType: "oauth2",
    triggers: [{ id: "message_posted", displayName: "Message Posted", payloadSchema: { channel: "string", text: "string" } }],
    actions: [
      { id: "send_message", displayName: "Send Message", inputSchema: { channel: "string", text: "string" } },
      { id: "create_channel", displayName: "Create Channel", inputSchema: { name: "string" } }
    ]
  },
  {
    id: "whatsapp",
    displayName: "WhatsApp",
    authType: "api_key",
    triggers: [{ id: "message_received", displayName: "Message Received", payloadSchema: { from: "string", text: "string" } }],
    actions: [{ id: "send_message", displayName: "Send Message", inputSchema: { to: "string", text: "string" } }]
  },
  {
    id: "gmail",
    displayName: "Gmail",
    authType: "oauth2",
    triggers: [{ id: "email_received", displayName: "Email Received", payloadSchema: { from: "string", subject: "string" } }],
    actions: [{ id: "send_email", displayName: "Send Email", inputSchema: { to: "string", subject: "string", body: "string" } }]
  },
  {
    id: "stripe",
    displayName: "Stripe",
    authType: "api_key",
    triggers: [{ id: "payment_succeeded", displayName: "Payment Succeeded", payloadSchema: { amount: "number", customerId: "string" } }],
    actions: [
      { id: "create_invoice", displayName: "Create Invoice", inputSchema: { customerId: "string", amount: "number" } },
      { id: "create_checkout_session", displayName: "Create Checkout Session", inputSchema: { amount: "number", currency: "string" } }
    ]
  },
  {
    id: "webhook",
    displayName: "Webhook",
    authType: "webhook_secret",
    triggers: [{ id: "request_received", displayName: "Request Received", payloadSchema: { body: "json" } }],
    actions: [{ id: "send_request", displayName: "Send Request", inputSchema: { url: "string", method: "string", body: "json" } }]
  }
];

export const getIntegration = (id: string): IntegrationDefinition | undefined =>
  integrationRegistry.find((integration) => integration.id === id);

export const hasIntegrationAction = (integrationId: string, actionId: string): boolean =>
  getIntegration(integrationId)?.actions.some((action) => action.id === actionId) ?? false;
