"use client";

import React, { useState, useEffect } from "react";
import PromptInput from "@/components/PromptInput";
import StageProgress from "@/components/StageProgress";
import ValidationPanel from "@/components/ValidationPanel";
import RepairLogPanel from "@/components/RepairLogPanel";
import AppSpecViewer from "@/components/AppSpecViewer";
import IntegrationViewer from "@/components/IntegrationViewer";
import { PipelineJob, GatewayConfig } from "@/types";
import Link from "next/link";

export default function Dashboard() {
  const [activeJob, setActiveJob] = useState<PipelineJob | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sseEventSource, setSseEventSource] = useState<EventSource | null>(null);

  // Close SSE stream on unmount
  useEffect(() => {
    return () => {
      if (sseEventSource) sseEventSource.close();
    };
  }, [sseEventSource]);

  const handleGenerationSubmit = async (prompt: string, config: GatewayConfig) => {
    setIsLoading(true);
    setActiveJob(null);

    if (sseEventSource) {
      sseEventSource.close();
      setSseEventSource(null);
    }

    try {
      // 1. Kick off the generation job
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, routingConfig: config }),
      });

      const { jobId, error } = await res.json();
      if (!res.ok) {
        alert(`Failed to start generation: ${error}`);
        setIsLoading(false);
        return;
      }

      // 2. Fetch initial job state
      const jobRes = await fetch(`/api/generate/${jobId}`);
      const initialJob = await jobRes.json();
      setActiveJob(initialJob);

      // 3. Connect to the SSE stream endpoint
      const es = new EventSource(`/api/generate/${jobId}/stream`);
      setSseEventSource(es);

      es.addEventListener("stage_start", async () => {
        const update = await fetchJobState(jobId);
        if (update) setActiveJob(update);
      });

      es.addEventListener("stage_complete", async () => {
        const update = await fetchJobState(jobId);
        if (update) setActiveJob(update);
      });

      es.addEventListener("stage_failed", async () => {
        const update = await fetchJobState(jobId);
        if (update) {
          setActiveJob(update);
          setIsLoading(false);
          es.close();
        }
      });

      es.addEventListener("generation_complete", async () => {
        const update = await fetchJobState(jobId);
        if (update) {
          setActiveJob(update);
          setIsLoading(false);
          es.close();
        }
      });

      es.onerror = () => {
        // SSE reconnect handles itself, but we can poll just in case
        console.warn("SSE stream encountered a connection break. Attempting recovery...");
      };
    } catch (err) {
      console.error("Pipeline initiation failed:", err);
      setIsLoading(false);
    }
  };

  const fetchJobState = async (jobId: string): Promise<PipelineJob | null> => {
    try {
      const res = await fetch(`/api/generate/${jobId}`);
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.error("Error polling job status:", err);
    }
    return null;
  };

  const handleManualRepairComplete = (updatedJob: PipelineJob) => {
    setActiveJob(updatedJob);
  };

  return (
    <main className="max-w-[1600px] mx-auto px-4 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-start pb-4 border-b border-zinc-800 animate-fade-in-down">
        <div className="flex-1" />
        <header className="flex-1 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-vibrant-purple via-vibrant-pink to-vibrant-cyan bg-clip-text text-transparent">
            AtlasGen
          </h1>
          <p className="text-sm text-zinc-400 mt-2">
            Build production-ready schemas and application specifications using multi-stage AI validation.
          </p>
        </header>
        
        {/* Navigation Link to Evaluation Page */}
        <div className="flex-1 flex justify-end">
          <Link
            href="/evaluate"
            className="px-4 py-2 bg-gradient-to-r from-vibrant-purple/10 to-vibrant-pink/10 border border-vibrant-purple/30 hover:border-vibrant-pink/50 rounded text-xs font-bold text-zinc-300 hover:text-white transition-all duration-300 hover:shadow-lg hover:shadow-vibrant-purple/20"
          >
            Open AtlasGen Benchmarks
          </Link>
        </div>
      </div>

      {/* Main dashboard splits */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left column: Input and Progress panels */}
        <div className="lg:col-span-5 space-y-6">
          <div className="card-stagger-1">
            <PromptInput onSubmit={handleGenerationSubmit} isLoading={isLoading} />
          </div>
          <div className="card-stagger-2">
            <StageProgress job={activeJob} />
          </div>
        </div>

        {/* Right column: Specs and logs panels */}
        <div className="lg:col-span-7 space-y-6">
          <div className="card-stagger-3">
            <AppSpecViewer job={activeJob} />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card-stagger-4">
              <ValidationPanel job={activeJob} />
            </div>
            <div className="card-stagger-5">
              <RepairLogPanel job={activeJob} onRepairTriggered={handleManualRepairComplete} />
            </div>
          </div>
        </div>
      </section>

      {/* Registry Panel footer */}
      <section className="pt-4 card-stagger-6">
        <IntegrationViewer />
      </section>
    </main>
  );
}
