"use client";

import { useEffect, useState } from "react";
import type { GenerationJob } from "@/types/job";
import type { IntegrationDefinition } from "@/types/integration";
import { PromptInput } from "@/components/PromptInput";
import { StageProgressPanel } from "@/components/StageProgressPanel";
import { ValidationPanel } from "@/components/ValidationPanel";
import { RepairLogPanel } from "@/components/RepairLogPanel";
import { AppSpecViewer } from "@/components/AppSpecViewer";
import { IntegrationRegistryViewer } from "@/components/IntegrationRegistryViewer";

export default function Home(): JSX.Element {
  const [prompt, setPrompt] = useState("Build a CRM with Slack alerts and Stripe invoicing");
  const [job, setJob] = useState<GenerationJob>();
  const [loading, setLoading] = useState(false);
  const [integrations, setIntegrations] = useState<IntegrationDefinition[]>([]);

  useEffect(() => {
    void fetch("/api/integrations")
      .then((response) => response.json() as Promise<{ integrations: IntegrationDefinition[] }>)
      .then((payload) => setIntegrations(payload.integrations));
  }, []);

  useEffect(() => {
    if (!job || job.status === "completed" || job.status === "failed") return;
    const source = new EventSource(`/api/generate/${job.id}/stream`);
    source.onmessage = () => undefined;
    ["stage_start", "stage_complete", "stage_failed", "generation_complete"].forEach((eventName) => {
      source.addEventListener(eventName, () => {
        void fetch(`/api/generate/${job.id}`).then((response) => response.json() as Promise<GenerationJob>).then((updated) => {
          setJob(updated);
          if (updated.status === "completed" || updated.status === "failed") setLoading(false);
        });
      });
    });
    return () => source.close();
  }, [job]);

  const submit = async (): Promise<void> => {
    setLoading(true);
    const response = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt }) });
    const created = await response.json() as GenerationJob;
    setJob(created);
  };

  const repair = async (): Promise<void> => {
    if (!job) return;
    const response = await fetch(`/api/generate/${job.id}/repair`, { method: "POST" });
    setJob(await response.json() as GenerationJob);
  };

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-6">
      <header>
        <h1 className="text-3xl font-bold">AtlasGen</h1>
        <p className="mt-2 text-slate-400">Natural language to validated AppSpec through a repairable multi-stage pipeline.</p>
      </header>
      <PromptInput prompt={prompt} loading={loading} onPromptChange={setPrompt} onSubmit={submit} />
      {job ? <button className="rounded-md border border-slate-700 px-4 py-2 text-sm" onClick={repair}>Run Manual Repair</button> : null}
      <div className="grid gap-6 lg:grid-cols-2">
        <StageProgressPanel events={job?.events ?? []} />
        <ValidationPanel validation={job?.validation} />
        <RepairLogPanel logs={job?.repairLogs ?? []} />
        <IntegrationRegistryViewer integrations={integrations} />
      </div>
      <AppSpecViewer appSpec={job?.appSpec} />
    </main>
  );
}
