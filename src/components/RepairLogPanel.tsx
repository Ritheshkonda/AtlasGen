import React, { useState } from "react";
import { PipelineJob } from "@/types";

interface RepairLogPanelProps {
  job: PipelineJob | null;
  onRepairTriggered: (updatedJob: PipelineJob) => void;
}

export default function RepairLogPanel({ job, onRepairTriggered }: RepairLogPanelProps) {
  const [isRepairing, setIsRepairing] = useState(false);

  if (!job) return null;

  const logs = job.repairLogs || [];

  const handleManualRepair = async () => {
    if (isRepairing) return;
    setIsRepairing(true);

    try {
      const res = await fetch(`/api/generate/${job.jobId}/repair`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        // Fetch full updated job structure
        const jobRes = await fetch(`/api/generate/${job.jobId}`);
        const updatedJob = await jobRes.json();
        onRepairTriggered(updatedJob);
      }
    } catch (err) {
      console.error("Manual repair action triggered failed:", err);
    } finally {
      setIsRepairing(false);
    }
  };

  return (
    <div className="premium-card p-6 animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2 bg-gradient-to-r from-vibrant-amber to-vibrant-orange bg-clip-text text-transparent">
          <span className="h-3 w-3 bg-gradient-to-r from-vibrant-amber to-vibrant-orange rounded-full inline-block"></span>
          Repair Engine Trace
        </h2>

        {/* Manual Trigger Button */}
        {job.status === "failed" && (
          <button
            onClick={handleManualRepair}
            className="px-3 py-1 bg-gradient-to-r from-vibrant-amber to-vibrant-orange hover:shadow-lg hover:shadow-vibrant-amber/40 text-zinc-950 text-xs font-bold rounded transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-50"
            disabled={isRepairing}
          >
            {isRepairing ? (
              <span className="flex items-center gap-1">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-950 border-t-transparent"></span>
                Repairing...
              </span>
            ) : (
              "Trigger Consistency Repair"
            )}
          </button>
        )}
      </div>

      {logs.length === 0 ? (
        <div className="bg-gradient-to-r from-zinc-950 to-zinc-900/50 p-4 rounded text-xs text-zinc-500 text-center font-mono border border-zinc-900 animate-fade-in-up">
          No repair interventions required. Generated outputs matched schema constraints directly.
        </div>
      ) : (
        <div className="space-y-3 animate-fade-in-up">
          <div className="flex justify-between items-center text-xs text-zinc-400 mb-2">
            <span>Repair Log History: <strong className="text-vibrant-amber">{logs.length} operations</strong></span>
          </div>

          <div className="max-h-72 overflow-y-auto space-y-2">
            {logs.map((log, idx) => (
              <div
                key={idx}
                className="p-3 bg-gradient-to-r from-zinc-950 to-zinc-900/40 border border-zinc-900 rounded text-xs leading-relaxed font-sans hover:border-vibrant-amber/30 hover:shadow-lg hover:shadow-vibrant-amber/10 transition-all duration-300 animate-fade-in-up"
                style={{animationDelay: `${idx * 0.05}s`}}
              >
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-vibrant-cyan uppercase font-bold">
                      Stage: {log.stage}
                    </span>
                    <span className="text-zinc-600">•</span>
                    <span className="font-mono text-[10px] text-vibrant-purple font-semibold uppercase">
                      Strategy: {log.strategy}
                    </span>
                  </div>
                  <span
                    className={`font-mono text-[9px] font-bold uppercase px-1.5 py-0.5 rounded transition-all duration-300 ${
                      log.outcome === "repaired"
                        ? "bg-vibrant-emerald/10 text-vibrant-emerald border border-vibrant-emerald/30 hover:border-vibrant-emerald/50 hover:shadow-lg hover:shadow-vibrant-emerald/10"
                        : "bg-vibrant-rose/10 text-vibrant-rose border border-vibrant-rose/30 hover:border-vibrant-rose/50 hover:shadow-lg hover:shadow-vibrant-rose/10"
                    }`}
                  >
                    {log.outcome}
                  </span>
                </div>

                <div className="text-zinc-300 mt-1">
                  <span className="text-vibrant-rose font-semibold">Error type: </span>
                  {log.errorType}
                </div>

                {log.details && (
                  <div className="text-zinc-400 mt-1 pl-3 border-l border-zinc-800 text-[11px] italic">
                    <span className="text-vibrant-emerald font-semibold not-italic">Outcome: </span>
                    {JSON.stringify(log.details)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
