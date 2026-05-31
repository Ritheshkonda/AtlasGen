# AtlasGen

Production-quality TypeScript + Next.js application that converts natural language application requests into validated `AppSpec` output through the AtlasGen three-stage pipeline.

## Structure

```text
src/
  app/            Next.js App Router pages and API routes
  components/     Minimal Tailwind UI panels
  lib/            In-memory job store and SSE event buffer
  types/          Zod schemas and strict TypeScript interfaces
  stages/         Intent, DataSchema, and AppSpec pipeline stages
  validators/     Reusable structure and cross-reference validators
  repair/         Structural, field, and consistency repair engine
  integrations/   Slack, WhatsApp, Gmail, Stripe, and Webhook registry
  gateway/        Provider-agnostic AI routing gateway
  routes/         Shared route constants
  logs/           Evaluation logs
```

## Pipeline

1. `IntentExtractorStage` turns a natural language prompt into app intent, features, entities, integrations, and assumptions.
2. `SchemaGeneratorStage` creates a multi-tenant relational `DataSchema` with required `tenantId` support and bidirectional relations.
3. `AppSpecGeneratorStage` creates pages, API endpoints, auth rules, integration hooks, and workflow stubs.

Each stage validates with Zod and semantic validators, applies deterministic repair strategies, records repair logs, and emits SSE lifecycle events.

## AI Gateway

Stages never call provider SDKs directly. Routing is config driven:

```json
{
  "intentExtraction": { "primary": "groq", "fallback": "openai" },
  "schemaGeneration": { "primary": "openai", "fallback": "gemini" },
  "appSpecGeneration": { "primary": "anthropic", "fallback": "mock" }
}
```

Supported providers: OpenAI, Groq, Gemini, Anthropic, DeepSeek, OpenRouter, Mistral, and deterministic `mock`.

Environment variables:

```text
OPENAI_API_KEY=
GROQ_API_KEY=
GEMINI_API_KEY=
ANTHROPIC_API_KEY=
DEEPSEEK_API_KEY=
OPENROUTER_API_KEY=
MISTRAL_API_KEY=
```

If configured providers are unavailable, the gateway ends with the deterministic mock provider so local evaluation still works without blind retries.

## API

- `POST /api/generate`
- `GET /api/generate/:jobId`
- `GET /api/generate/:jobId/stream`
- `GET /api/integrations`
- `POST /api/generate/:jobId/repair`

## Running

```bash
npm run dev
npm run typecheck
npm run build
```

Open `http://localhost:3000`.

## Evaluation

Use `/evaluate` to run:

- CRM
- Task Manager
- Inventory
- HR Tool
- Ecommerce
- Event Platform
- Project Tracker
- An app
- Task manager but make it smart
- CRM + Project Manager + Invoicing
- Build something like Notion for doctors

The UI writes `evaluation-log.json` at the workspace root and `src/logs/evaluation-log.json`.
