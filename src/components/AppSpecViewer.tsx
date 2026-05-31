"use client";

import type { AppSpecOutput } from "@/types/appSpec";

export function AppSpecViewer({ appSpec }: { appSpec?: AppSpecOutput }): JSX.Element {
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <h2 className="text-lg font-semibold">AppSpec Viewer</h2>
      <pre className="mt-3 max-h-[36rem] overflow-auto rounded bg-slate-950 p-3 text-xs text-slate-200">
        {appSpec ? JSON.stringify(appSpec, null, 2) : "No AppSpec generated yet."}
      </pre>
    </section>
  );
}
