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
    <div className="premium-card p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-vibrant-amber flex items-center gap-2">
          <span className="h-3 w-3 bg-vibrant-amber block rounded-full"></span>
          Repair Engine Trace
        </h2>

        {/* Manual Trigger Button */}
        {job.status === "failed" && (
          <button
            onClick={handleManualRepair}
            className="px-3 py-1 bg-vibrant-amber hover:bg-yellow-600 text-zinc-950 text-xs font-bold rounded shadow transition-colors"
            disabled={isRepairing}
          >
            {isRepairing ? "Repairing..." : "Trigger Consistency Repair"}
          </button>
        )}
      </div>

      {logs.length === 0 ? (
        <div className="bg-zinc-950 p-4 rounded text-xs text-zinc-500 text-center font-mono">
          No repair interventions required. Generated outputs matched schema constraints directly.
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-between items-center text-xs text-zinc-400 mb-2">
            <span>Repair Log History: <strong className="text-vibrant-amber">{logs.length} operations</strong></span>
          </div>

          <div className="max-h-72 overflow-y-auto space-y-2">
            {logs.map((log, idx) => (
              <div
                key={idx}
                className="p-3 bg-zinc-950 border border-zinc-900 rounded text-xs leading-relaxed font-sans"
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
                    className={`font-mono text-[9px] font-bold uppercase px-1.5 py-0.2 rounded ${
                      log.outcome === "repaired"
                        ? "bg-vibrant-emerald/10 text-vibrant-emerald border border-vibrant-emerald/30"
                        : "bg-vibrant-rose/10 text-vibrant-rose border border-vibrant-rose/30"
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
