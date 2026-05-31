import { NextResponse } from "next/server";
import { INTEGRATION_REGISTRY } from "@/integrations/registry";

export async function GET() {
  return NextResponse.json(Object.values(INTEGRATION_REGISTRY), {
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
