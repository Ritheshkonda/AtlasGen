export const API_ROUTES = {
  createGeneration: "/api/generate",
  getGeneration: (jobId: string) => `/api/generate/${jobId}`,
  streamGeneration: (jobId: string) => `/api/generate/${jobId}/stream`,
  repairGeneration: (jobId: string) => `/api/generate/${jobId}/repair`,
  integrations: "/api/integrations",
} as const;

export const APP_ROUTES = {
  dashboard: "/",
  evaluate: "/evaluate",
} as const;
