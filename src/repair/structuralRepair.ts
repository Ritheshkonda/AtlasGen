import type { RepairLog, StageName } from "@/types/common";
import { createRepairLog } from "@/logs/logger";

export interface StructuralRepairResult {
  value: unknown;
  logs: RepairLog[];
}

const closeJson = (text: string): string => {
  const stack: string[] = [];
  let inString = false;
  let escaped = false;
  for (const char of text) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\" && inString) {
      escaped = true;
      continue;
    }
    if (char === '"') inString = !inString;
    if (inString) continue;
    if (char === "{") stack.push("}");
    if (char === "[") stack.push("]");
    if ((char === "}" || char === "]") && stack.at(-1) === char) stack.pop();
  }
  return `${text}${inString ? '"' : ""}${stack.reverse().join("")}`;
};

export const structuralRepair = (stage: StageName, value: unknown): StructuralRepairResult => {
  const logs: RepairLog[] = [];
  if (typeof value !== "string") return { value, logs };
  const trimmed = value.trim().replace(/^```(?:json)?/u, "").replace(/```$/u, "").trim();
  const candidates = [trimmed, closeJson(trimmed)];
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as unknown;
      logs.push(createRepairLog({ stage, strategy: "structural", error: "Raw model output was a JSON string or malformed JSON.", outcome: "Parsed JSON after structural cleanup." }));
      return { value: parsed, logs };
    } catch {
      continue;
    }
  }
  logs.push(createRepairLog({ stage, strategy: "structural", error: "Unable to parse malformed JSON.", outcome: "Returned original value for validator diagnostics." }));
  return { value, logs };
};
