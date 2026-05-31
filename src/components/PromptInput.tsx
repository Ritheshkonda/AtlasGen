import React, { useState } from "react";
import { GatewayConfig, ProviderId } from "@/types";

interface PromptInputProps {
  onSubmit: (prompt: string, config: GatewayConfig) => void;
  isLoading: boolean;
}

const PRESETS = [
  { label: "CRM", prompt: "Create a CRM application with lead tracking, deals pipeline, contacts hasMany deals, and Slack message integration." },
  { label: "Task Manager", prompt: "Build a multi-tenant Task Manager with project sprints, task belongsTo project, and automatic Gmail daily digests." },
  { label: "Inventory System", prompt: "Design an Inventory app tracking warehouses, stock movements, products hasMany movements, and Stripe invoices." },
  { label: "HR Portal", prompt: "Develop an HR Tool managing employees, leaves belongsTo employee, performance reviews, and email approvals." },
  { label: "Ecommerce Shop", prompt: "Generate an Ecommerce app with products list, customer orders, stripe checkout, and WhatsApp notifications." },
  { label: "Event Platform", prompt: "Build an Event Booking app with venues, ticket registrations hasMany tickets, and Gmail QR sendouts." },
  { label: "Project Tracker", prompt: "Build a Project Tracker with milestones hasMany tasks, and webhook webhook callback integrations." },
  { label: "Edge Vague: An app", prompt: "An app" },
  { label: "Edge: Smart Task", prompt: "Task manager but make it smart" },
  { label: "Edge Complex: CRM Combo", prompt: "CRM + Project Manager + Invoicing with stripe integrations" },
  { label: "Edge Custom: Notion Docs", prompt: "Build something like Notion for doctors with patient workspace and HIPAA text updates" },
];

const PROVIDERS: ProviderId[] = ["gemini", "mock", "openai", "groq", "anthropic", "deepseek", "openrouter", "mistral"];

export default function PromptInput({ onSubmit, isLoading }: PromptInputProps) {
  const [prompt, setPrompt] = useState("");
  const [stage1Pri, setStage1Pri] = useState<ProviderId>("gemini");
  const [stage1Fall, setStage1Fall] = useState<ProviderId>("mock");
  const [stage2Pri, setStage2Pri] = useState<ProviderId>("gemini");
  const [stage2Fall, setStage2Fall] = useState<ProviderId>("mock");
  const [stage3Pri, setStage3Pri] = useState<ProviderId>("gemini");
  const [stage3Fall, setStage3Fall] = useState<ProviderId>("mock");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    const routingConfig: GatewayConfig = {
      intentExtraction: { primary: stage1Pri, fallback: stage1Fall },
      schemaGeneration: { primary: stage2Pri, fallback: stage2Fall },
      appSpecGeneration: { primary: stage3Pri, fallback: stage3Fall },
    };

    onSubmit(prompt, routingConfig);
  };

  return (
    <div className="premium-card p-6">
      <h2 className="text-xl font-bold mb-4 text-vibrant-purple flex items-center gap-2">
        <span className="h-3 w-3 bg-vibrant-purple block rounded-full"></span>
        AI Generation Request
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Prompt Input */}
        <div>
          <label className="block text-sm font-semibold text-zinc-400 mb-2">
            Natural Language prompt
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Type your application requirements here..."
            className="w-full h-32 px-4 py-3 bg-[#09090b] border border-zinc-800 rounded-md text-sm text-[#fafafa] placeholder-zinc-600 focus:outline-none focus:border-vibrant-purple focus:ring-1 focus:ring-vibrant-purple resize-none"
            disabled={isLoading}
          />
        </div>

        {/* Examples Presets */}
        <div>
          <label className="block text-sm font-semibold text-zinc-400 mb-2">
            Load Evaluation Benchmark Presets & Edge Cases
          </label>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setPrompt(preset.prompt)}
                className="px-2.5 py-1 text-xs bg-zinc-900 border border-zinc-850 hover:bg-zinc-850 hover:border-vibrant-pink rounded text-zinc-300 transition-colors"
                disabled={isLoading}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Gateway Config Router */}
        <div className="border-t border-zinc-800/80 pt-4">
          <label className="block text-xs uppercase tracking-wider font-bold text-zinc-500 mb-3">
            AI Gateway Routing Configuration
          </label>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Stage 1 Routing */}
            <div className="bg-zinc-950 p-3 rounded-md border border-zinc-900">
              <span className="block text-xs font-semibold text-vibrant-cyan mb-2">
                Stage 1: Intent Routing
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase font-bold">Primary</label>
                  <select
                    value={stage1Pri}
                    onChange={(e) => setStage1Pri(e.target.value as ProviderId)}
                    className="w-full bg-zinc-900 border border-zinc-800 text-xs py-1 px-1.5 rounded text-zinc-300"
                  >
                    {PROVIDERS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase font-bold">Fallback</label>
                  <select
                    value={stage1Fall}
                    onChange={(e) => setStage1Fall(e.target.value as ProviderId)}
                    className="w-full bg-zinc-900 border border-zinc-800 text-xs py-1 px-1.5 rounded text-zinc-300"
                  >
                    {PROVIDERS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Stage 2 Routing */}
            <div className="bg-zinc-950 p-3 rounded-md border border-zinc-900">
              <span className="block text-xs font-semibold text-vibrant-emerald mb-2">
                Stage 2: Schema Routing
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase font-bold">Primary</label>
                  <select
                    value={stage2Pri}
                    onChange={(e) => setStage2Pri(e.target.value as ProviderId)}
                    className="w-full bg-zinc-900 border border-zinc-800 text-xs py-1 px-1.5 rounded text-zinc-300"
                  >
                    {PROVIDERS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase font-bold">Fallback</label>
                  <select
                    value={stage2Fall}
                    onChange={(e) => setStage2Fall(e.target.value as ProviderId)}
                    className="w-full bg-zinc-900 border border-zinc-800 text-xs py-1 px-1.5 rounded text-zinc-300"
                  >
                    {PROVIDERS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Stage 3 Routing */}
            <div className="bg-zinc-950 p-3 rounded-md border border-zinc-900">
              <span className="block text-xs font-semibold text-vibrant-pink mb-2">
                Stage 3: AppSpec Routing
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase font-bold">Primary</label>
                  <select
                    value={stage3Pri}
                    onChange={(e) => setStage3Pri(e.target.value as ProviderId)}
                    className="w-full bg-zinc-900 border border-zinc-800 text-xs py-1 px-1.5 rounded text-zinc-300"
                  >
                    {PROVIDERS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase font-bold">Fallback</label>
                  <select
                    value={stage3Fall}
                    onChange={(e) => setStage3Fall(e.target.value as ProviderId)}
                    className="w-full bg-zinc-900 border border-zinc-800 text-xs py-1 px-1.5 rounded text-zinc-300"
                  >
                    {PROVIDERS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          type="submit"
          className="w-full py-3 px-4 bg-vibrant-purple border border-vibrant-indigo text-sm font-semibold rounded text-white hover:bg-vibrant-indigo disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          disabled={isLoading || !prompt.trim()}
        >
          {isLoading ? "Running AtlasGen..." : "Generate with AtlasGen"}
        </button>
      </form>
    </div>
  );
}
