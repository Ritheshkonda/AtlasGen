import React from "react";
import { INTEGRATION_REGISTRY } from "@/integrations/registry";

export default function IntegrationViewer() {
  const items = Object.values(INTEGRATION_REGISTRY);

  return (
    <div className="premium-card p-6">
      <h2 className="text-xl font-bold mb-4 text-vibrant-emerald flex items-center gap-2">
        <span className="h-3 w-3 bg-vibrant-emerald block rounded-full"></span>
        Registered Integration Hooks
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="p-4 bg-zinc-950 border border-zinc-900 rounded-md font-sans text-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-zinc-900">
                <span className="font-bold text-vibrant-emerald text-sm">{item.displayName}</span>
                <span className="font-mono text-[9px] text-zinc-500 bg-zinc-900 px-1 py-0.2 rounded uppercase">
                  {item.authType}
                </span>
              </div>

              {/* Triggers */}
              <div className="mb-3">
                <span className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">triggers</span>
                <div className="flex flex-wrap gap-1 font-mono">
                  {item.triggers.map((trig) => (
                    <span key={trig} className="bg-zinc-900 border border-zinc-850 px-1.5 py-0.2 text-[9px] rounded text-zinc-400">
                      {trig}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div>
                <span className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">actions</span>
                <div className="flex flex-wrap gap-1 font-mono">
                  {item.actions.map((act) => (
                    <span key={act} className="bg-vibrant-cyan/5 border border-vibrant-cyan/20 px-1.5 py-0.2 text-[9px] rounded text-vibrant-cyan font-semibold">
                      {act}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-2 border-t border-zinc-900 text-[10px] text-zinc-500 font-mono text-center">
              id: {item.id}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
