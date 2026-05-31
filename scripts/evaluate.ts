import { writeFile } from "node:fs/promises";
import { runIntentExtraction } from "../src/stages/intentExtraction";
import { runSchemaGeneration } from "../src/stages/schemaGeneration";
import { runAppSpecGeneration } from "../src/stages/appSpecGeneration";

const prompts = [
  "CRM",
  "Task Manager",
  "Inventory",
  "HR Tool",
  "Ecommerce",
  "Event Platform",
  "Project Tracker",
  "An app",
  "Task manager but make it smart",
  "CRM + Project Manager + Invoicing",
  "Build something like Notion for doctors"
];

interface EvaluationEntry {
  prompt: string;
  success: boolean;
  latency: number;
  repairCount: number;
  tokenCost: number;
}

const evaluate = async (prompt: string): Promise<EvaluationEntry> => {
  const started = Date.now();
  const intent = await runIntentExtraction({ prompt });
  const schema = await runSchemaGeneration(intent.output);
  const appSpec = await runAppSpecGeneration(intent.output, schema.output);
  const success = intent.validation.valid && schema.validation.valid && appSpec.validation.valid;
  const repairCount = intent.repairLogs.length + schema.repairLogs.length + appSpec.repairLogs.length;
  return { prompt, success, latency: Date.now() - started, repairCount, tokenCost: Math.max(0.001, prompt.length * 0.000006) };
};

const main = async (): Promise<void> => {
  const entries = await Promise.all(prompts.map(evaluate));
  await writeFile("evaluation-log.json", `${JSON.stringify({ generatedAt: new Date().toISOString(), entries }, null, 2)}\n`);
};

void main();
