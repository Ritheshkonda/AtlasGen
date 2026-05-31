import { integrationRegistry } from "@/integrations/registry";

export async function GET(): Promise<Response> {
  return Response.json({ integrations: integrationRegistry });
}
