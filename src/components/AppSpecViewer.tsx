import React, { useState } from "react";
import { PipelineJob } from "@/types";

interface AppSpecViewerProps {
  job: PipelineJob | null;
}

export default function AppSpecViewer({ job }: AppSpecViewerProps) {
  const [activeTab, setActiveTab] = useState<"schema" | "appspec" | "json">("schema");

  if (!job) {
    return (
      <div className="premium-card p-6 h-[450px] flex items-center justify-center text-zinc-500 text-sm animate-fade-in">
        <div className="text-center">
          <div className="h-12 w-12 rounded-full bg-gradient-to-r from-vibrant-purple/20 to-vibrant-pink/20 mx-auto mb-3 animate-pulse-soft"></div>
          <p>Specification viewer is idle. Awaiting pipeline outputs...</p>
        </div>
      </div>
    );
  }

  const { schema, appSpec } = job;

  return (
    <div className="premium-card p-6 h-[450px] flex flex-col animate-fade-in">
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-zinc-800">
        <h2 className="text-xl font-bold flex items-center gap-2 bg-gradient-to-r from-vibrant-purple to-vibrant-indigo bg-clip-text text-transparent">
          <span className="h-3 w-3 bg-gradient-to-r from-vibrant-purple to-vibrant-indigo rounded-full inline-block"></span>
          Application Specifications
        </h2>
        {/* Tab Selection */}
        <div className="flex gap-1.5 bg-zinc-950 p-1 border border-zinc-850 rounded text-xs font-semibold">
          <button
            onClick={() => setActiveTab("schema")}
            className={`px-3 py-1 rounded transition-all duration-300 transform ${
              activeTab === "schema" 
                ? "bg-gradient-to-r from-vibrant-purple to-vibrant-indigo text-white shadow-lg shadow-vibrant-purple/20" 
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Data Schema
          </button>
          <button
            onClick={() => setActiveTab("appspec")}
            className={`px-3 py-1 rounded transition-all duration-300 transform ${
              activeTab === "appspec" 
                ? "bg-gradient-to-r from-vibrant-cyan to-vibrant-emerald text-white shadow-lg shadow-vibrant-cyan/20" 
                : "text-zinc-400 hover:text-zinc-200 disabled:opacity-50"
            }`}
            disabled={!appSpec}
          >
            AppSpec Spec
          </button>
          <button
            onClick={() => setActiveTab("json")}
            className={`px-3 py-1 rounded transition-all duration-300 transform ${
              activeTab === "json" 
                ? "bg-gradient-to-r from-vibrant-pink to-vibrant-rose text-white shadow-lg shadow-vibrant-pink/20" 
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Raw JSON
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 text-xs">
        {/* TAB 1: DATA SCHEMA */}
        {activeTab === "schema" && (
          <div className="space-y-4 animate-fade-in-up">
            {!schema ? (
              <div className="text-zinc-500 italic py-8 text-center font-mono">
                Data Schema has not been generated yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {schema.entities.map((entity, idx) => (
                  <div 
                    key={idx} 
                    className="bg-gradient-to-br from-zinc-950 to-zinc-900/50 p-4 rounded border border-zinc-900 font-sans hover:border-vibrant-emerald/30 transition-all duration-300 animate-fade-in-up"
                    style={{animationDelay: `${idx * 0.05}s`}}
                  >
                    <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-zinc-900">
                      <span className="font-bold text-vibrant-emerald text-sm">{entity.name}</span>
                      <span className="font-mono text-[10px] text-zinc-500 bg-zinc-900/80 px-2 py-0.5 rounded">
                        table: {entity.tableName}
                      </span>
                    </div>

                    <div className="mb-2">
                      <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                        tenant isolation
                      </span>
                      <span className="bg-gradient-to-r from-zinc-900 to-zinc-900/50 border border-zinc-850 px-2 py-0.5 rounded text-zinc-300 font-mono">
                        tenantId: {entity.tenantId}
                      </span>
                    </div>

                    {/* Columns List */}
                    <div className="mb-3">
                      <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Columns</span>
                      <div className="space-y-1">
                        {entity.fields.map((field, fIdx) => (
                          <div key={fIdx} className="flex justify-between bg-zinc-900/60 p-1.5 rounded font-mono hover:bg-zinc-900 transition-colors duration-300">
                            <span className="text-zinc-300 font-medium">
                              {field.name}
                              {field.isPrimaryKey && <span className="ml-1 text-vibrant-amber text-[9px]">🔑 PK</span>}
                              {field.required && <span className="ml-0.5 text-vibrant-rose text-[9px]">*</span>}
                            </span>
                            <span className="text-vibrant-cyan text-[10px]">{field.type}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Relations */}
                    <div>
                      <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Relations</span>
                      {entity.relations.length === 0 ? (
                        <span className="text-[10px] text-zinc-600 italic">No relations mapped</span>
                      ) : (
                        <div className="space-y-1">
                          {entity.relations.map((rel, rIdx) => (
                            <div 
                              key={rIdx} 
                              className="bg-gradient-to-r from-zinc-900/40 to-transparent p-1.5 rounded font-mono border border-zinc-900/80 hover:border-vibrant-pink/30 transition-all duration-300"
                            >
                              <span className="text-vibrant-pink">{rel.type} </span>
                              <span className="text-[#fafafa]">{rel.targetEntity} </span>
                              <span className="text-zinc-500">fk: {rel.foreignKey}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: APPSPEC */}
        {activeTab === "appspec" && (
          <div className="space-y-4 animate-fade-in-up">
            {!appSpec ? (
              <div className="text-zinc-500 italic py-8 text-center font-mono">
                AppSpec specifications have not been generated yet.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Pages */}
                <div className="animate-fade-in-up">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-vibrant-purple mb-2">Pages SPEC</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {appSpec.pages.map((p, idx) => (
                      <div 
                        key={idx} 
                        className="bg-gradient-to-br from-vibrant-purple/5 to-transparent p-3 rounded border border-vibrant-purple/20 font-mono hover:border-vibrant-purple/40 transition-all duration-300 animate-fade-in-up"
                        style={{animationDelay: `${idx * 0.05}s`}}
                      >
                        <div className="font-bold text-vibrant-cyan text-[13px]">{p.name}</div>
                        <div className="text-zinc-500 text-[10px] mb-2">path: {p.path} (Entity: {p.entityContext})</div>
                        <div className="flex flex-wrap gap-1.5">
                          {p.components.map((c, cIdx) => (
                            <span key={cIdx} className="bg-zinc-900 px-2 py-0.5 rounded text-zinc-300 text-[10px] hover:bg-zinc-800 transition-colors">
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* API Endpoints */}
                <div className="animate-fade-in-up" style={{animationDelay: "0.1s"}}>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-vibrant-cyan mb-2">API Route Map</h3>
                  <div className="space-y-1.5">
                    {appSpec.apiEndpoints.map((api, idx) => (
                      <div 
                        key={idx} 
                        className="flex justify-between items-center bg-gradient-to-r from-zinc-950 to-transparent p-2.5 rounded border border-zinc-900 font-mono hover:border-vibrant-cyan/40 hover:shadow-lg hover:shadow-vibrant-cyan/10 transition-all duration-300 animate-fade-in-up"
                        style={{animationDelay: `${0.1 + idx * 0.03}s`}}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 text-[9px] font-extrabold rounded transition-all duration-300 ${
                            api.method === "GET" ? "bg-vibrant-emerald/10 text-vibrant-emerald border border-vibrant-emerald/20 hover:border-vibrant-emerald/40" :
                            api.method === "POST" ? "bg-vibrant-cyan/10 text-vibrant-cyan border border-vibrant-cyan/20 hover:border-vibrant-cyan/40" :
                            "bg-vibrant-pink/10 text-vibrant-pink border border-vibrant-pink/20 hover:border-vibrant-pink/40"
                          }`}>
                            {api.method}
                          </span>
                          <span className="text-zinc-300 text-xs font-medium">{api.path}</span>
                        </div>
                        <span className="text-zinc-500 text-[10px]">Entity: {api.entityContext}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Workflows */}
                <div className="animate-fade-in-up" style={{animationDelay: "0.15s"}}>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-vibrant-pink mb-2">Automated Workflows</h3>
                  <div className="space-y-3">
                    {appSpec.workflowStubs.map((wf, idx) => (
                      <div 
                        key={idx} 
                        className="bg-gradient-to-br from-vibrant-pink/5 to-transparent p-4 rounded border border-vibrant-pink/20 font-sans hover:border-vibrant-pink/40 transition-all duration-300 animate-fade-in-up"
                        style={{animationDelay: `${0.15 + idx * 0.05}s`}}
                      >
                        <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-zinc-900 font-mono">
                          <span className="font-bold text-vibrant-pink">{wf.name}</span>
                          <span className="text-[10px] text-zinc-500">
                            On: {wf.triggerEntity} ({wf.triggerEvent})
                          </span>
                        </div>

                        <div className="space-y-2">
                          {wf.steps.map((step, sIdx) => (
                            <div 
                              key={sIdx} 
                              className="flex items-center gap-3 bg-zinc-900/60 p-2 rounded text-xs font-mono hover:bg-zinc-900 transition-all duration-300"
                            >
                              <span className="text-zinc-500 font-bold">#{step.order}</span>
                              <span className="bg-zinc-950 px-1.5 py-0.2 text-[9px] uppercase font-bold text-zinc-400 border border-zinc-850 hover:border-zinc-700 transition-colors">
                                {step.type}
                              </span>
                              <span className="text-zinc-300">
                                target: <strong className="text-[#fafafa]">{step.target}</strong>
                              </span>
                              <span className="text-zinc-500">→</span>
                              <span className="text-vibrant-cyan">action: {step.action}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: RAW JSON */}
        {activeTab === "json" && (
          <pre className="h-full bg-zinc-950 p-4 border border-zinc-900 text-zinc-300 rounded font-mono text-[11px] overflow-auto select-all animate-fade-in hover:border-vibrant-purple/30 transition-colors">
            {JSON.stringify({ intent: job.intent, schema: job.schema, appSpec: job.appSpec }, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
