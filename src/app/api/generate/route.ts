import { createGenerateRoute } from "@/routes/generate";

export async function POST(request: Request): Promise<Response> {
  return createGenerateRoute(await request.json());
}
