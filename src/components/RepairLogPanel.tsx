"use client";

import type { RepairLog } from "@/types/common";

export function RepairLogPanel({ logs }: { logs: RepairLog[] }): JSX.Element {
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <h2 className="text-lg font-semibold">Repair Logs</h2>
      <div className="mt-3 space-y-2 text-sm">
        {logs.length === 0 ? <p className="text-slate-400">No repairs applied.</p> : logs.map((log, index) => (
          <div key={`${log.timestamp}-${index}`} className="rounded border border-slate-800 p-2">
            <p className="font-medium">{log.stage} · {log.strategy}</p>
            <p className="text-red-200">{log.error}</p>
            <p className="text-emerald-200">{log.outcome}</p>
            <p className="text-xs text-slate-500">{log.timestamp}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
