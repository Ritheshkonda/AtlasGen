import React from "react";
import { PipelineJob } from "@/types";

interface ValidationPanelProps {
  job: PipelineJob | null;
}

export default function ValidationPanel({ job }: ValidationPanelProps) {
  if (!job) return null;

  const errors = job.errors || [];
  const semanticErrors = job.semanticErrors || [];
  const activeErrors = errors.filter((e) => e.severity === "error").length + semanticErrors.filter((e) => e.severity === "error").length;
  const warnings = errors.filter((e) => e.severity === "warning").length + semanticErrors.filter((e) => e.severity === "warning").length;

  return (
    <div className="premium-card p-6">
      <h2 className="text-xl font-bold mb-4 text-vibrant-pink flex items-center gap-2">
        <span className="h-3 w-3 bg-vibrant-pink block rounded-full"></span>
        Validation Engine Audit
      </h2>

      {errors.length === 0 && semanticErrors.length === 0 ? (
        <div className="bg-vibrant-emerald/5 border border-vibrant-emerald/30 p-4 rounded text-sm text-vibrant-emerald font-medium">
          ✓ All Zod schemas and semantic relations passed validation checks with 100% integrity.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-4 text-xs font-semibold mb-2">
            <span className="px-2.5 py-1 bg-vibrant-rose/10 border border-vibrant-rose text-vibrant-rose rounded">
              {activeErrors} Errors
            </span>
            <span className="px-2.5 py-1 bg-vibrant-amber/10 border border-vibrant-amber text-vibrant-amber rounded">
              {warnings} Warnings
            </span>
          </div>

          <div className="max-h-72 overflow-y-auto space-y-2">
            {semanticErrors.map((err, idx) => (
              <div key={`semantic-${idx}`} className="p-3 rounded border text-xs bg-vibrant-amber/5 border-vibrant-amber/30 text-zinc-300">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-mono text-[10px] font-bold uppercase px-1 rounded bg-vibrant-amber/15 text-vibrant-amber">
                    {err.severity}
                  </span>
                  <span className="font-mono text-[10px] text-zinc-500">{err.type}</span>
                </div>
                <p className="text-zinc-200 leading-relaxed font-sans">{err.message}</p>
              </div>
            ))}
            {errors.map((err, idx) => (
              <div
                key={idx}
                className={`p-3 rounded border text-xs ${
                  err.severity === "error"
                    ? "bg-vibrant-rose/5 border-vibrant-rose/30 text-zinc-300"
                    : "bg-vibrant-amber/5 border-vibrant-amber/30 text-zinc-300"
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span
                    className={`font-mono text-[10px] font-bold tracking-tight uppercase px-1 rounded ${
                      err.severity === "error"
                        ? "bg-vibrant-rose/15 text-vibrant-rose"
                        : "bg-vibrant-amber/15 text-vibrant-amber"
                    }`}
                  >
                    {err.severity}
                  </span>
                  <span className="font-mono text-[10px] text-zinc-500">{err.path}</span>
                </div>
                <p className="text-zinc-200 leading-relaxed font-sans">{err.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
