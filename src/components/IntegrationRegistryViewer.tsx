"use client";

import type { IntegrationDefinition } from "@/types/integration";

export function IntegrationRegistryViewer({ integrations }: { integrations: IntegrationDefinition[] }): JSX.Element {
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <h2 className="text-lg font-semibold">Integration Registry</h2>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {integrations.map((integration) => (
          <div key={integration.id} className="rounded border border-slate-800 p-3 text-sm">
            <p className="font-semibold">{integration.displayName}</p>
            <p className="text-slate-400">Auth: {integration.authType}</p>
            <p className="mt-2 text-slate-300">Actions: {integration.actions.map((action) => action.id).join(", ")}</p>
            <p className="text-slate-300">Triggers: {integration.triggers.map((trigger) => trigger.id).join(", ")}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
