import { z } from "zod";
import { createGenerationJob, getJob, repairJob } from "@/lib/jobStore";

export const GenerateRequestSchema = z.object({ prompt: z.string().min(1) });

export const createGenerateRoute = async (body: unknown): Promise<Response> => {
  const parsed = GenerateRequestSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Prompt is required." }, { status: 400 });
  const job = createGenerationJob(parsed.data.prompt);
  return Response.json(job, { status: 202 });
};

export const getGenerateRoute = async (jobId: string): Promise<Response> => {
  const job = getJob(jobId);
  if (!job) return Response.json({ error: "Job not found." }, { status: 404 });
  return Response.json(job);
};

export const repairGenerateRoute = async (jobId: string): Promise<Response> => {
  const job = repairJob(jobId);
  if (!job) return Response.json({ error: "Job not found." }, { status: 404 });
  return Response.json(job);
};
