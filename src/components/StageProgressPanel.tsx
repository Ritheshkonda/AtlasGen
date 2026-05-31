"use client";

import type { PipelineEvent } from "@/types/common";

export function StageProgressPanel({ events }: { events: PipelineEvent[] }): JSX.Element {
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <h2 className="text-lg font-semibold">Stage Progress</h2>
      <div className="mt-3 space-y-2 text-sm">
        {events.length === 0 ? <p className="text-slate-400">No events yet.</p> : events.map((event) => (
          <div key={event.id} className="rounded border border-slate-800 p-2">
            <div className="flex justify-between gap-3">
              <span>{event.type} {event.stage ? `· ${event.stage}` : ""}</span>
              <span className="text-slate-400">{event.latency}ms</span>
            </div>
            <p className="text-xs text-slate-500">{event.timestamp}</p>
            {event.message ? <p className="text-xs text-cyan-300">{event.message}</p> : null}
          </div>
        ))}
      </div>
    </section>
  );
}
