import type { PipelineEvent, PipelineEventType, RepairLog, StageName } from "@/types/common";

export const createRepairLog = (input: Omit<RepairLog, "timestamp">): RepairLog => ({
  ...input,
  timestamp: new Date().toISOString()
});

export const createPipelineEvent = (input: {
  id: number;
  type: PipelineEventType;
  stage?: StageName;
  latency?: number;
  repairLogs?: RepairLog[];
  message?: string;
}): PipelineEvent => ({
  id: input.id,
  type: input.type,
  stage: input.stage,
  timestamp: new Date().toISOString(),
  latency: input.latency ?? 0,
  repairLogs: input.repairLogs ?? [],
  message: input.message
});
