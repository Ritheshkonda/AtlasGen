import React from "react";
import { PipelineJob } from "@/types";

interface StageProgressProps {
  job: PipelineJob | null;
}

export default function StageProgress({ job }: StageProgressProps) {
  if (!job) {
    return (
      <div className="premium-card p-6 flex items-center justify-center h-48 text-zinc-500 text-sm">
        AtlasGen is idle. Submit a prompt to start generation.
      </div>
    );
  }

  const stages = [
    {
      key: "intent",
      name: "Stage 1: Intent Extraction",
      description: "Parses prompt, categorizes appType, features, entities, and resolves ambiguity.",
      color: "text-vibrant-cyan",
      borderColor: "border-vibrant-cyan",
      bgColor: "bg-vibrant-cyan/10",
    },
    {
      key: "schema",
      name: "Stage 2: DataSchema Generation",
      description: "Creates database models, structures columns, primary keys, and ensures bidirectional relation symmetry.",
      color: "text-vibrant-emerald",
      borderColor: "border-vibrant-emerald",
      bgColor: "bg-vibrant-emerald/10",
    },
    {
      key: "appspec",
      name: "Stage 3: AppSpec Generation",
      description: "Assembles frontend layouts, REST endpoints, roles scopes, and links integrations to workflows.",
      color: "text-vibrant-pink",
      borderColor: "border-vibrant-pink",
      bgColor: "bg-vibrant-pink/10",
    },
  ];

  return (
    <div className="premium-card p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-vibrant-cyan flex items-center gap-2">
          <span className="h-3 w-3 bg-vibrant-cyan block rounded-full"></span>
          AtlasGen Stage Progress
        </h2>
        <div className="flex items-center gap-4 text-xs font-semibold text-zinc-400">
          <span>Job ID: <code className="text-[#fafafa] bg-zinc-900 px-1.5 py-0.5 rounded">{job.jobId}</code></span>
          <span>Status: 
            <span className={`ml-1.5 px-2 py-0.5 rounded uppercase ${
              job.status === "completed" ? "bg-vibrant-emerald/20 text-vibrant-emerald" :
              job.status === "failed" ? "bg-vibrant-rose/20 text-vibrant-rose" :
              job.status === "running" ? "bg-vibrant-amber/20 text-vibrant-amber" :
              "bg-zinc-800 text-zinc-400"
            }`}>
              {job.status}
            </span>
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {stages.map((stage) => {
          const latency = job.latency[stage.key];
          const isActive = job.currentStage === stage.key;
          const isCompleted =
            (stage.key === "intent" && !!job.intent) ||
            (stage.key === "schema" && !!job.schema) ||
            (stage.key === "appspec" && job.status === "completed");

          const isStageFailed =
            job.status === "failed" &&
            ((stage.key === "intent" && !job.intent) ||
              (stage.key === "schema" && job.intent && !job.schema) ||
              (stage.key === "appspec" && job.schema && !job.appSpec));

          let statusText = "Pending";
          let statusBadgeClass = "bg-zinc-900 border-zinc-800 text-zinc-500";
          if (isActive && job.status === "running") {
            statusText = "Running";
            statusBadgeClass = "bg-vibrant-amber/10 border-vibrant-amber text-vibrant-amber";
          } else if (isCompleted) {
            statusText = "Completed";
            statusBadgeClass = "bg-vibrant-emerald/10 border-vibrant-emerald text-vibrant-emerald";
          } else if (isStageFailed) {
            statusText = "Failed";
            statusBadgeClass = "bg-vibrant-rose/10 border-vibrant-rose text-vibrant-rose";
          }

          return (
            <div
              key={stage.key}
              className={`p-4 rounded-md border ${
                isActive ? `${stage.borderColor} bg-zinc-950` : "border-zinc-850 bg-zinc-950/40"
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className={`text-sm font-bold ${stage.color}`}>{stage.name}</span>
                <span className={`text-[10px] uppercase font-bold border px-1.5 py-0.5 rounded ${statusBadgeClass}`}>
                  {statusText}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mb-3">{stage.description}</p>
              
              {/* Metrics row */}
              <div className="flex items-center gap-6 text-[11px] text-zinc-500 font-mono">
                {latency !== undefined && (
                  <span>Latency: <strong className="text-zinc-300">{latency}ms</strong></span>
                )}
                {isCompleted && (
                  <span>Cost: <strong className="text-zinc-300">~${((stage.key === "intent" ? 180 : stage.key === "schema" ? 180 : 180) * 0.000015).toFixed(4)}</strong></span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Footer statistics summary */}
      {job.status === "completed" && (
        <div className="mt-4 pt-4 border-t border-zinc-900 flex justify-between items-center text-xs text-zinc-400">
          <span>Total AtlasGen Duration: <strong className="text-[#fafafa]">{Object.values(job.latency).reduce((a, b) => a + b, 0)}ms</strong></span>
          <span>Repair Interventions: <strong className="text-vibrant-pink">{job.repairLogs.length}</strong></span>
        </div>
      )}
    </div>
  );
}
