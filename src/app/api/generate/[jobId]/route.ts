import { NextResponse } from "next/server";
import { JobStore } from "@/lib/job-store";

export async function GET(
  req: Request,
  { params }: { params: { jobId: string } }
) {
  const { jobId } = params;
  const job = JobStore.getJob(jobId);

  if (!job) {
    return NextResponse.json(
      { error: `Job '${jobId}' not found.` },
      { status: 404 }
    );
  }

  return NextResponse.json(job);
}
