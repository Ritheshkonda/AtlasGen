"use client";

import React, { useState } from "react";
import Link from "next/link";
import { PipelineJob, ValidationError } from "@/types";

interface EvalTestResult {
  name: string;
  prompt: string;
  category: "benchmark" | "edge_case";
  status: "pending" | "running" | "success" | "failed";
  latency: number;
  repairCount: number;
  tokenCost: number;
  errors: string[];
}

const INITIAL_SUITE: EvalTestResult[] = [
  {
    name: "CRM Suite",
    prompt: "Create a CRM application with lead tracking, deals pipeline, contacts hasMany deals, and Slack message integration.",
    category: "benchmark",
    status: "pending",
    latency: 0,
    repairCount: 0,
    tokenCost: 0,
    errors: [],
  },
  {
    name: "Task Manager Suite",
    prompt: "Build a multi-tenant Task Manager with project sprints, task belongsTo project, and automatic Gmail daily digests.",
    category: "benchmark",
    status: "pending",
    latency: 0,
    repairCount: 0,
    tokenCost: 0,
    errors: [],
  },
  {
    name: "Inventory Suite",
    prompt: "Design an Inventory app tracking warehouses, stock movements, products hasMany movements, and Stripe invoices.",
    category: "benchmark",
    status: "pending",
    latency: 0,
    repairCount: 0,
    tokenCost: 0,
    errors: [],
  },
  {
    name: "HR Tool Suite",
    prompt: "Develop an HR Tool managing employees, leaves belongsTo employee, performance reviews, and email approvals.",
    category: "benchmark",
    status: "pending",
    latency: 0,
    repairCount: 0,
    tokenCost: 0,
    errors: [],
  },
  {
    name: "Ecommerce Suite",
    prompt: "Generate an Ecommerce app with products list, customer orders, stripe checkout, and WhatsApp notifications.",
    category: "benchmark",
    status: "pending",
    latency: 0,
    repairCount: 0,
    tokenCost: 0,
    errors: [],
  },
  {
    name: "Event Platform Suite",
    prompt: "Build an Event Booking app with venues, ticket registrations hasMany tickets, and Gmail QR sendouts.",
    category: "benchmark",
    status: "pending",
    latency: 0,
    repairCount: 0,
    tokenCost: 0,
    errors: [],
  },
  {
    name: "Project Tracker Suite",
    prompt: "Build a Project Tracker with milestones hasMany tasks, and webhook webhook callback integrations.",
    category: "benchmark",
    status: "pending",
    latency: 0,
    repairCount: 0,
    tokenCost: 0,
    errors: [],
  },
  {
    name: "Edge Case: An App",
    prompt: "An app",
    category: "edge_case",
    status: "pending",
    latency: 0,
    repairCount: 0,
    tokenCost: 0,
    errors: [],
  },
  {
    name: "Edge Case: Smart Task Manager",
    prompt: "Task manager but make it smart",
    category: "edge_case",
    status: "pending",
    latency: 0,
    repairCount: 0,
    tokenCost: 0,
    errors: [],
  },
  {
    name: "Edge Case: CRM Combo",
    prompt: "CRM + Project Manager + Invoicing with stripe integrations",
    category: "edge_case",
    status: "pending",
    latency: 0,
    repairCount: 0,
    tokenCost: 0,
    errors: [],
  },
  {
    name: "Edge Case: Notion for Doctors",
    prompt: "Build something like Notion for doctors with patient workspace and HIPAA text updates",
    category: "edge_case",
    status: "pending",
    latency: 0,
    repairCount: 0,
    tokenCost: 0,
    errors: [],
  },
];

export default function EvaluateDashboard() {
  const [suite, setSuite] = useState<EvalTestResult[]>(INITIAL_SUITE);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTestName, setCurrentTestName] = useState<string>("");
  const [savedPath, setSavedPath] = useState<string>("");

  const runSingleTest = async (index: number): Promise<EvalTestResult> => {
    const test = suite[index];
    setCurrentTestName(test.name);

    // Update status to running
    setSuite((prev) => {
      const updated = [...prev];
      updated[index].status = "running";
      return updated;
    });

    const startTime = Date.now();

    try {
      // 1. Kick off generator
      const generateRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: test.prompt,
          routingConfig: {
            intentExtraction: { primary: "gemini", fallback: "mock" },
            schemaGeneration: { primary: "gemini", fallback: "mock" },
            appSpecGeneration: { primary: "gemini", fallback: "mock" },
          },
        }),
      });

      if (!generateRes.ok) {
        throw new Error(`Generation trigger failed: ${generateRes.statusText}`);
      }

      const { jobId } = await generateRes.json();

      // Poll until completed or failed
      let finalJobState: PipelineJob | null = null;
      let completed = false;

      while (!completed) {
        await new Promise((resolve) => setTimeout(resolve, 800)); // sleep 800ms
        const statusRes = await fetch(`/api/generate/${jobId}`);
        if (!statusRes.ok) throw new Error("Status query failed");

        const job = (await statusRes.json()) as PipelineJob;
        if (job.status === "completed" || job.status === "failed") {
          finalJobState = job;
          completed = true;
        }
      }

      const totalLatency = Date.now() - startTime;
      if (!finalJobState) {
        throw new Error("Generation finished without a readable job state.");
      }

      const blockingErrors: ValidationError[] = finalJobState.errors.filter((e) => e.severity === "error");

      const success = blockingErrors.length === 0;

      return {
        ...test,
        status: success ? "success" : "failed",
        latency: totalLatency,
        repairCount: finalJobState.repairLogs.length,
        tokenCost: finalJobState.tokenCost || 0,
        errors: blockingErrors.map((e) => `[${e.path}] ${e.message}`),
      };
    } catch (err) {
      return {
        ...test,
        status: "failed",
        latency: Date.now() - startTime,
        repairCount: 0,
        tokenCost: 0,
        errors: [(err as Error).message],
      };
    }
  };

  const startSuiteExecution = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setSavedPath("");

    // Initialize suite to pending
    setSuite(INITIAL_SUITE);

    const completedResults: EvalTestResult[] = [];

    for (let i = 0; i < INITIAL_SUITE.length; i++) {
      const result = await runSingleTest(i);
      completedResults.push(result);
      setSuite((prev) => {
        const updated = [...prev];
        updated[i] = result;
        return updated;
      });
    }

    // Save final report to c:\projects\AISIGNAL\evaluation-log.json
    try {
      const saveRes = await fetch("/api/evaluate/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(completedResults, null, 2),
      });
      const saveJson = await saveRes.json();
      if (saveRes.ok) {
        setSavedPath(saveJson.path);
      }
    } catch (err) {
      console.error("Failed to write evaluation file:", err);
    }

    setIsRunning(false);
    setCurrentTestName("");
  };

  // Calculates running totals
  const totalLatency = suite.reduce((acc, t) => acc + t.latency, 0);
  const totalRepairs = suite.reduce((acc, t) => acc + t.repairCount, 0);
  const totalTokenCost = suite.reduce((acc, t) => acc + t.tokenCost, 0);
  const successCount = suite.filter((t) => t.status === "success").length;
  const completedCount = suite.filter((t) => t.status === "success" || t.status === "failed").length;

  return (
    <main className="max-w-[1400px] mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <header className="flex justify-between items-center pb-4 border-b border-zinc-800 animate-fade-in-down">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-vibrant-pink via-vibrant-purple to-vibrant-cyan bg-clip-text text-transparent">
            AtlasGen Benchmark Suite
          </h1>
          <p className="text-sm text-zinc-400 mt-2">
            Standardized evaluation matrix auditing 7 primary frameworks and 4 distinct boundary test cases.
          </p>
        </div>

        <Link
          href="/"
          className="px-4 py-2 bg-gradient-to-r from-vibrant-purple/10 to-vibrant-pink/10 border border-vibrant-purple/30 hover:border-vibrant-pink/50 rounded text-xs font-bold text-zinc-300 hover:text-white transition-all duration-300 hover:shadow-lg hover:shadow-vibrant-purple/20"
        >
          Return to AtlasGen
        </Link>
      </header>

      {/* Control bar & summary stats */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
        <div className="premium-card p-4 card-stagger-1 hover:scale-105 transition-transform duration-300">
          <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Benchmark Actions</span>
          <button
            onClick={startSuiteExecution}
            className="w-full mt-2 py-2.5 px-4 bg-gradient-to-r from-vibrant-pink to-vibrant-purple hover:shadow-lg hover:shadow-vibrant-pink/40 text-sm font-semibold rounded text-white disabled:opacity-50 transition-all duration-300 transform hover:scale-105 active:scale-95"
            disabled={isRunning}
          >
            {isRunning ? `Running: ${currentTestName}...` : "Execute Full Benchmark Suite"}
          </button>
        </div>

        <div className="premium-card p-4 card-stagger-2 hover:scale-105 transition-transform duration-300">
          <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Success Ratio</span>
          <div className="text-2xl font-mono font-bold mt-1 bg-gradient-to-r from-vibrant-emerald to-vibrant-cyan bg-clip-text text-transparent">
            {completedCount > 0 ? `${Math.round((successCount / completedCount) * 100)}%` : "0%"}
            <span className="text-xs font-normal text-zinc-500 ml-1.5 block mt-1">
              ({successCount}/{completedCount} passed)
            </span>
          </div>
        </div>

        <div className="premium-card p-4 card-stagger-3 hover:scale-105 transition-transform duration-300">
          <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Combined Latency</span>
          <div className="text-2xl font-mono font-bold mt-1 bg-gradient-to-r from-vibrant-cyan to-vibrant-purple bg-clip-text text-transparent">
            {totalLatency}ms
            <span className="text-xs font-normal text-zinc-500 ml-1.5 block mt-1">
              (~{(totalLatency / 1000).toFixed(1)}s total)
            </span>
          </div>
        </div>

        <div className="premium-card p-4 card-stagger-4 hover:scale-105 transition-transform duration-300">
          <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Repairs Triggered</span>
          <div className="text-2xl font-mono font-bold mt-1 bg-gradient-to-r from-vibrant-amber to-vibrant-pink bg-clip-text text-transparent">
            {totalRepairs}
            <span className="text-xs font-normal text-zinc-500 ml-1.5 block mt-1">interventions</span>
          </div>
        </div>
      </section>

      {/* Save Success Alert */}
      {savedPath && (
        <div className="bg-gradient-to-r from-vibrant-emerald/10 to-vibrant-cyan/10 border border-vibrant-emerald/40 p-4 rounded text-xs text-vibrant-emerald font-mono animate-fade-in-up shadow-lg shadow-vibrant-emerald/10">
          ✓ Export completed! Evaluation matrix saved directly to workspace root: <span className="font-bold underline">{savedPath}</span>
        </div>
      )}

      {/* Main Benchmarks Table */}
      <section className="premium-card overflow-hidden card-stagger-5 animate-fade-in">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-gradient-to-r from-zinc-950 to-zinc-900 border-b border-zinc-800 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
              <th className="p-4">Benchmark Spec Name</th>
              <th className="p-4">Category</th>
              <th className="p-4">Latency (ms)</th>
              <th className="p-4">Repair count</th>
              <th className="p-4">Prompt Requirements</th>
              <th className="p-4">Audit Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900 bg-zinc-950/20">
            {suite.map((test, idx) => (
              <tr 
                key={idx} 
                className="hover:bg-zinc-950/60 font-sans transition-colors duration-300 animate-fade-in-up"
                style={{
                  animationDelay: `${idx * 0.05}s`
                }}
              >
                <td className="p-4 font-bold text-zinc-200">{test.name}</td>
                <td className="p-4">
                  <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono transition-all duration-300 ${
                    test.category === "benchmark" ? "bg-vibrant-purple/10 text-vibrant-purple border border-vibrant-purple/20 hover:border-vibrant-purple/50" :
                    "bg-vibrant-pink/10 text-vibrant-pink border border-vibrant-pink/20 hover:border-vibrant-pink/50"
                  }`}>
                    {test.category}
                  </span>
                </td>
                <td className="p-4 font-mono font-semibold bg-gradient-to-r from-vibrant-cyan/20 to-transparent bg-clip-text text-transparent">{test.status !== "pending" ? `${test.latency}ms` : "-"}</td>
                <td className="p-4 font-mono font-semibold text-vibrant-amber">{test.status !== "pending" ? test.repairCount : "-"}</td>
                <td className="p-4 text-zinc-400 truncate max-w-xs" title={test.prompt}>{test.prompt}</td>
                <td className="p-4">
                  <span className={`px-2 py-0.5 rounded uppercase font-bold text-[10px] font-mono transition-all duration-300 ${
                    test.status === "success" ? "bg-vibrant-emerald/10 text-vibrant-emerald border border-vibrant-emerald/30 shadow-lg shadow-vibrant-emerald/10" :
                    test.status === "failed" ? "bg-vibrant-rose/10 text-vibrant-rose border border-vibrant-rose/30 shadow-lg shadow-vibrant-rose/10" :
                    test.status === "running" ? "bg-vibrant-amber/10 text-vibrant-amber border border-vibrant-amber/30 animate-pulse-soft shadow-lg shadow-vibrant-amber/10" :
                    "bg-zinc-900 text-zinc-500 border border-zinc-850"
                  }`}>
                    {test.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Errors list */}
      {suite.some((t) => t.errors.length > 0) && (
        <section className="premium-card p-6 card-stagger-6 animate-fade-in">
          <h3 className="text-sm font-bold bg-gradient-to-r from-vibrant-rose to-vibrant-pink bg-clip-text text-transparent uppercase tracking-wider mb-3">Benchmark Issue Report</h3>
          <div className="space-y-2">
            {suite.map((test) => {
              if (test.errors.length === 0) return null;
              return (
                <div key={test.name} className="p-3 bg-gradient-to-r from-vibrant-rose/5 to-vibrant-pink/5 border border-vibrant-rose/20 rounded hover:border-vibrant-rose/40 transition-all duration-300">
                  <span className="font-bold text-vibrant-rose text-xs block mb-1">{test.name} Errors:</span>
                  <ul className="list-disc pl-5 space-y-1 font-mono text-[11px] text-zinc-400">
                    {test.errors.map((e, idx) => (
                      <li key={idx} className="hover:text-zinc-300 transition-colors">{e}</li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
