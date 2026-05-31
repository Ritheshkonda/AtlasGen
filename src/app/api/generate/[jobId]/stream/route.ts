import { NextResponse } from "next/server";
import { JobStore } from "@/lib/job-store";
import { SSEEvent } from "@/types";

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

  const encoder = new TextEncoder();

  // Create standard Web ReadableStream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // 1. Replay historical events to support seamless client reconnects
      const history = JobStore.getSSEHistory(jobId);
      history.forEach((event) => {
        const formatted = `id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(
          event.data
        )}\n\n`;
        controller.enqueue(encoder.encode(formatted));
      });

      // 2. Define listener callback for active pipeline streaming updates
      const listener = (event: SSEEvent) => {
        try {
          const formatted = `id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(
            event.data
          )}\n\n`;
          controller.enqueue(encoder.encode(formatted));
        } catch (err) {
          console.error(`Error sending SSE event:`, err);
        }
      };

      // Register listener
      JobStore.addSSEListener(jobId, listener);

      // Keep connection alive with simple heartbeat ping every 15s
      const interval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch (err) {
          // Stream might be closed
        }
      }, 15000);

      // 3. Clean up hook on client abort/disconnect
      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        JobStore.removeSSEListener(jobId, listener);
        try {
          controller.close();
        } catch (err) {
          // Stream already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "Content-Encoding": "none",
    },
  });
}
