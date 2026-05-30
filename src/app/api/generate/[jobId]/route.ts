import { getGenerateRoute } from "@/routes/generate";

export async function GET(_request: Request, context: { params: { jobId: string } }): Promise<Response> {
  return getGenerateRoute(context.params.jobId);
}
