import { repairGenerateRoute } from "@/routes/generate";

export async function POST(_request: Request, context: { params: { jobId: string } }): Promise<Response> {
  return repairGenerateRoute(context.params.jobId);
}
