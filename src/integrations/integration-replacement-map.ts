export const INTEGRATION_REPLACEMENT_MAP: Readonly<Record<string, string>> = {
  telegram: "whatsapp",
  discord: "webhook",
  teams: "slack",
  "microsoft teams": "slack",
  twilio: "webhook",
  zapier: "webhook",
} as const;

export const KNOWN_UNSUPPORTED_INTEGRATIONS = Object.keys(INTEGRATION_REPLACEMENT_MAP);
