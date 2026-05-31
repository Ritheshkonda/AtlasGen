import React from "react";
import { PipelineJob } from "@/types";

interface StageProgressProps {
  job: PipelineJob | null;
}

export default function StageProgress({ job }: StageProgressProps) {
  if (!job) {
    return (
      <div className="premium-card p-6 flex items-center justify-center h-48 text-zinc-500 text-sm animate-fade-in">
        <div className="text-center">
          <div className="h-12 w-12 rounded-full bg-gradient-to-r from-vibrant-purple/20 to-vibrant-pink/20 mx-auto mb-3 animate-pulse-soft"></div>
          <p>AtlasGen is idle. Submit a prompt to start generation.</p>
        </div>
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
      gradientFrom: "from-vibrant-cyan",
      gradientTo: "to-vibrant-indigo"
    },
    {
      key: "schema",
      name: "Stage 2: DataSchema Generation",
      description: "Creates database models, structures columns, primary keys, and ensures bidirectional relation symmetry.",
      color: "text-vibrant-emerald",
      borderColor: "border-vibrant-emerald",
      bgColor: "bg-vibrant-emerald/10",
      gradientFrom: "from-vibrant-emerald",
      gradientTo: "to-vibrant-cyan"
    },
    {
      key: "appspec",
      name: "Stage 3: AppSpec Generation",
      description: "Assembles frontend layouts, REST endpoints, roles scopes, and links integrations to workflows.",
      color: "text-vibrant-pink",
      borderColor: "border-vibrant-pink",
      bgColor: "bg-vibrant-pink/10",
      gradientFrom: "from-vibrant-pink",
      gradientTo: "to-vibrant-purple"
    },
  ];

  return (
    <div className="premium-card p-6 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className={`text-xl font-bold flex items-center gap-2 bg-gradient-to-r from-vibrant-cyan to-vibrant-emerald bg-clip-text text-transparent`}>
          <span className="h-3 w-3 bg-gradient-to-r from-vibrant-cyan to-vibrant-emerald rounded-full inline-block"></span>
          AtlasGen Stage Progress
        </h2>
        <div className="flex items-center gap-4 text-xs font-semibold text-zinc-400">
          <span>Job ID: <code className="text-[#fafafa] bg-zinc-900 px-2 py-1 rounded font-mono text-[10px]">{job.jobId}</code></span>
          <span>Status: 
            <span className={`ml-1.5 px-2 py-1 rounded uppercase text-xs font-bold animate-scale-in ${
              job.status === "completed" ? "bg-vibrant-emerald/20 text-vibrant-emerald border border-vibrant-emerald/30" :
              job.status === "failed" ? "bg-vibrant-rose/20 text-vibrant-rose border border-vibrant-rose/30" :
              job.status === "running" ? "bg-vibrant-amber/20 text-vibrant-amber border border-vibrant-amber/30 animate-pulse-soft" :
              "bg-zinc-800 text-zinc-400 border border-zinc-700"
            }`}>
              {job.status}
            </span>
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {stages.map((stage, idx) => {
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
              className={`p-4 rounded-md border transition-all duration-300 animate-fade-in-up ${
                isActive 
                  ? `${stage.borderColor} bg-gradient-to-r ${stage.gradientFrom} ${stage.gradientTo} bg-opacity-5 shadow-lg shadow-${stage.color}/10` 
                  : "border-zinc-850 bg-zinc-950/40"
              }`}
              style={{
                animationDelay: `${idx * 0.1}s`
              }}
            >
              <div className="flex justify-between items-start mb-1">
                <span className={`text-sm font-bold ${stage.color}`}>{stage.name}</span>
                <span className={`text-[10px] uppercase font-bold border px-1.5 py-0.5 rounded transition-all duration-300 ${statusBadgeClass}`}>
                  {statusText}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mb-3">{stage.description}</p>
              
              {/* Metrics row */}
              <div className="flex items-center gap-6 text-[11px] text-zinc-500 font-mono">
                {latency !== undefined && (
                  <span className="animate-fade-in">Latency: <strong className="text-zinc-300">{latency}ms</strong></span>
                )}
                {isCompleted && (
                  <span className="animate-fade-in">Cost: <strong className="text-zinc-300">~${((stage.key === "intent" ? 180 : stage.key === "schema" ? 180 : 180) * 0.000015).toFixed(4)}</strong></span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Footer statistics summary */}
      {job.status === "completed" && (
        <div className="mt-4 pt-4 border-t border-zinc-900 flex justify-between items-center text-xs text-zinc-400 animate-fade-in-up">
          <span>Total AtlasGen Duration: <strong className="text-[#fafafa]">{Object.values(job.latency).reduce((a, b) => a + b, 0)}ms</strong></span>
          <span>Repair Interventions: <strong className="text-vibrant-pink">{job.repairLogs.length}</strong></span>
        </div>
      )}
    </div>
  );
}
