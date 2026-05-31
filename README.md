# AtlasGen

AtlasGen is a production-oriented TypeScript + Next.js application generation pipeline. It converts a natural language request into a validated `AppSpec` through three explicit stages with reusable validation, deterministic repair, provider-agnostic AI routing, and SSE progress streaming.

## Folder Structure

```text
src/
  app/            Next.js app router pages and API endpoints
  components/     React UI panels
  lib/            job store, helpers, pipeline orchestration utilities
  types/          TypeScript interfaces and Zod schemas
  stages/         intent, data schema, and AppSpec generation stages
  validators/     structure and cross-reference validators
  repair/         structural, field, and consistency repair engines
  integrations/   integration registry
  gateway/        provider-agnostic AI gateway and routing config
  routes/         route handlers independent from Next.js bindings
  logs/           event and repair log helpers
```

## Pipeline

1. **Intent Extraction** produces app name, app type, features, entities, requested integrations, and assumptions. Vague prompts receive assumptions rather than blind retries.
2. **Schema Generation** produces a multi-tenant `DataSchema` where every entity includes `tenantId` and relation inverses are checked.
3. **AppSpec Generation** produces pages, API endpoints, auth rules, integration hooks, and workflow stubs.

Every stage has typed input/output, Zod validation, repair support, and event logging.

## Validation Engine

Validators never throw. They return:

```ts
{
  valid: boolean,
  errors: ValidationError[]
}
```

The engine validates schema structure, required fields, cross references, bidirectional relations, page/API consistency, and integration/action consistency.

## Repair Engine

AtlasGen implements three explicit repair strategies:

- **Structural Repair**: parses fenced or malformed JSON, recovers truncated JSON, and preserves validator diagnostics when recovery is impossible.
- **Field Repair**: fills missing required fields and coerces known wrong primitive shapes to typed defaults.
- **Consistency Repair**: repairs inverse relations, page/API mismatches, workflow entity references, and invalid integration action references.

Each repair emits a timestamped repair log with stage, strategy, error, and outcome.

## AI Gateway

Stage code calls `AiGateway` only. Provider routing is config-driven in `src/gateway/config.ts`:

```ts
{
  intentExtraction: { primary: "groq", fallback: "openai" },
  schemaGeneration: { primary: "openai", fallback: "gemini" },
  appSpecGeneration: { primary: "anthropic", fallback: "mistral" }
}
```

Providers are currently represented by SDK-free provider adapters so the pipeline remains testable and provider-agnostic. Real SDK calls can be added inside `src/gateway/providers.ts` without changing stage code.

## Integration Registry

The registry includes Slack, WhatsApp, Gmail, Stripe, and Webhook integrations. Workflow stubs and hooks must reference registered integration actions or validation fails.

## API

- `POST /api/generate`
- `GET /api/generate/:jobId`
- `GET /api/generate/:jobId/stream`
- `GET /api/integrations`
- `POST /api/generate/:jobId/repair`

The stream endpoint emits `stage_start`, `stage_complete`, `stage_failed`, and `generation_complete` events. Events are persisted in memory per job and replayed on reconnect using `Last-Event-ID`.

## UI

The minimal Tailwind UI includes prompt input, stage progress, validation output, repair logs, AppSpec JSON viewer, and integration registry viewer.

## Commands

```bash
npm install
npm run typecheck
npm run build
npm run evaluate
```

`npm run evaluate` writes `evaluation-log.json` for CRM, task manager, inventory, HR, ecommerce, event platform, project tracker, and edge-case prompts.
