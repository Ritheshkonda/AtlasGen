import type { PipelineEvent } from "@/types/common";
import { getJob, subscribeToJob } from "@/lib/jobStore";

const encodeEvent = (event: PipelineEvent): string => `id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;

export async function GET(request: Request, context: { params: { jobId: string } }): Promise<Response> {
  const job = getJob(context.params.jobId);
  if (!job) return Response.json({ error: "Job not found." }, { status: 404 });
  const lastEventId = Number(request.headers.get("last-event-id") ?? "0");
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      job.events.filter((event) => event.id > lastEventId).forEach((event) => controller.enqueue(encoder.encode(encodeEvent(event))));
      const unsubscribe = subscribeToJob(context.params.jobId, (event) => controller.enqueue(encoder.encode(encodeEvent(event))));
      request.signal.addEventListener("abort", () => {
        unsubscribe();
        controller.close();
      });
    }
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}
