# Changelog

All notable changes to Stackby Studio are recorded here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Planned
- `services/build` — Firecracker/gVisor sandboxed build service (C.7)
- `services/publish` — Deployment, routing, custom domains (C.8)
- `services/design` — Design system extraction from rendered styles (C.9)
- `services/git` — GitHub/GitLab export and bidirectional sync
- `apps/api` — Full BFF with project, run, artifact, credits, admin routes
- `apps/studio-web` — Builder UI (Home, Builder Shell, Plan Review, Preview Host, Visual Edit, Publish, Admin)
- `packages/ui` — Shared Radix UI component library
- Eval harness — 200+ golden cases for `packages/prompts`

---

## [0.5.0] — 2026-09-01

### Added — `packages/prompts` (prompt assembly + B.0–B.13 agent prompt library)

**Prompt assembly infrastructure:**
Cache-optimised assembly with stable segment ordering that maximises Anthropic
prompt-cache hits: `[sharedPreamble] → [sdkDocs] → [schema] → [tokens] → [plan] → [conversation] → [turnInstruction]`.
Stable content always heads the prompt so the first 2 segments get a cache hit on every
LLM call. Ships 8 typed agent instructions via `AGENTS` and a single `buildPrompt()` entry-point.

**B.0–B.13 Agent Prompt Library** (`PROMPT_VERSION = "1.5.0"`):
Full set of 14 agent prompt definitions, 14 typed zod output schemas, and 13
`build*Messages` functions for composing LLM calls. Covers the complete generation
pipeline (B.1–B.9) plus out-of-pipeline real-time stages (B.10–B.13). Every schema
enforces its structural invariants at parse time — blocker+pass conflicts, binding_ref
cross-references, path-traversal guards, token mutual exclusion, and more.

See `docs/agent-prompts/B0–B13.md` for the full prompt library.

**Test counts:** 12 assembly + 208 prompt + 44 schema-types (all passing)

---

## [0.4.0] — 2026-09-01

### Added — `services/orchestrator` (C.5 Temporal agent pipeline)

Full Temporal worker implementation running the Studio generation pipeline.

**`GenerationWorkflow` — 12-activity pipeline:**

| Activity | Tier | Notes |
|----------|------|-------|
| `analyzeIntent` | T1 | Classifies prompt → artifact type + intent |
| `analyzeSchema` | T1 | Calls `services/schema` profile endpoint |
| `clarify` | T1 | Emits ≤3 questions; **SUSPENDS** on `clarifyResponse` signal |
| `generatePlan` | T2 | Persists plan; **SUSPENDS** for `approvePlan`/`rejectPlan` signal (up to 7 days) |
| `generateDesign` | T2 | Design context and token mapping |
| `generateCode` | T2 | Emits `FileOperation[]`; streams `codegen` events |
| `applyOperations` | — | Deterministic; rejects duplicate path writes |
| `buildArtifact` | — | Calls `services/build`; emits build progress events |
| `verifyVisually` | T3 | Screenshot → vision model → pass/fail + issues |
| `fixCode` | T2 | Patches root causes; loops back to apply (max 3 cycles) |
| `summarise` | T0 | 2-sentence summary; emits `ready` event |
| `finalise` | — | New version record, thumbnail, telemetry |

**Suspension and signals:** `approvePlan`, `rejectPlan`, `clarifyResponse`, `cancel` — all via Temporal signals. Workflow waits up to 7 days for human review.

**Resilience:** Every activity has a Redis idempotency key keyed to `{workflowId}:{activity}:{attempt}` — a worker crash mid-run resumes from the last successful activity with no duplicated side effects or double-charges.

**RunEvent streaming:** Every activity calls `emitEvent` → `XADD run:events:{runId}` → SSE relay at `GET /runs/:runId/events?from={seq}` replays from any sequence number. A client that reloads mid-run resumes exactly where it stopped.

**LLM cost tracking:** Every LLM call records `modelId`, `tokensIn`, `tokensOut`, `cachedTokens`, `latencyMs`, and USD cost estimate to `run_steps` table and ClickHouse.

**4 variant workflows:**
- `VisualEditWorkflow` — single patch, skips planning, skips verify unless layout-affecting
- `AnnotationWorkflow` — batch annotations → scoped edits, critical-first ordering
- `StackGenerationWorkflow` — creates synthetic Stackby stacks (B.12)
- `DesignExtractionWorkflow` — cancellable, streaming, resumable (C.9)

**Files:** 39 new files · 22/22 tests passing

---

## [0.3.0] — 2026-09-01

### Added — `services/gateway` (C.3 Data Gateway)

Full implementation of the highest-criticality service. This is the only component
permitted to hold Stackby credentials and the only path from any artifact to Stackby data.

**Request lifecycle (enforced in this order):**
1. JWT authentication — Studio session tokens and signed artifact runtime tokens
2. Permission resolution — `permissionScopeHash` computed deterministically over visible tables, views, columns, and row filters
3. Binding validation — requests for bindings not declared at artifact build time are rejected 403 `BINDING_NOT_DECLARED`
4. Cache lookup — key includes `permissionScopeHash`; entries are never shared across permission scopes
5. Coalescing lock — concurrent identical cache misses produce exactly one upstream fetch
6. Token bucket — per-stack atomic Lua bucket at 4 rps; callers block, never drop
7. 429 handling — 30s cooldown, stale-while-revalidate; viewers never see a rate-limit error
8. Column masking — happens at serve time after cache read; hidden columns are structurally absent, not null
9. Shape and respond with `{ data, meta: { rowIds, columnIds, cacheAgeMs, truncated, upstreamCalls } }`

**Writes (`POST /dg/v1/mutate`):**
- Chunked to ≤10 records per upstream call, serialised per stack
- Idempotency-Key required; replays return original result
- Per-record results — never all-or-nothing

**Aggregation (`POST /dg/v1/aggregate`):**
- Computed over the cached row set — raw rows never shipped
- Supports: `count | sum | avg | min | max | countDistinct | percentile`
- Every metric carries `basis: n` (denominator)

**Security tests (gates every deploy):**
- `cache-poisoning.test.ts` — two viewers with different permissions, same logical query → different cache keys → salary column structurally absent from restricted viewer's response
- `bindings.test.ts` — undeclared table, undeclared column, missing registration all return 403
- `write-chunking.test.ts` — 34 records → exactly 4 upstream calls [10, 10, 10, 4]
- `rate-limit.test.ts` — token bucket enforcement; zero client 429s under cooldown
- `permissions.test.ts` — permission matrix across viewer roles; hidden columns absent not null
- `aggregation.test.ts` — all 7 aggregate functions; groupBy; basis denominator

**Files:** 34 new files · 2,079 insertions · **45/45 tests passing**

---

## [0.2.0] — 2026-09-01

### Added — `services/schema` (C.2 Schema Service)

Full implementation of the schema introspection and semantic profiling service.

**Responsibilities:**
- Introspect a Stackby stack into a normalised `SchemaGraph` (tables, columns, views, relationships) via the Data Gateway — never directly to Stackby
- Compute `SemanticProfile` per table: display column, status column, date columns (ordered by usefulness), owner column, image column, measures, natural groupings — each inference carries `confidence` and `basis`
- Sample up to 50 rows per table with PII redaction (email/phone → `{type, nullRate, cardinality}`)
- Generate `types.ts`: exact TypeScript interfaces with union types for selects, `readonly` markers on derived columns — output verified via `ts.transpileModule`
- Detect schema drift: added, removed, renamed, retyped columns; reports which `DataBinding`s each change breaks

**API:**
- `GET /schema/:stackId` — SchemaGraph (Redis-cached 15 min, ETag/304)
- `POST /schema/:stackId/refresh` — revalidate, return diff
- `GET /schema/:stackId/profile` — SemanticProfile + samples
- `POST /schema/:stackId/types` — `{ typescript: string }`
- `POST /schema/:stackId/drift` — `{ changes[], affectedBindings[] }`

**Fixtures:** 3-table ACME PM stack covering all 29 column types including link/lookup/rollup/count chains two hops deep.

**Files:** 26 new files · 3,117 insertions · **47/47 tests passing**

---

## [0.1.0] — 2026-09-01

### Added — Monorepo scaffold

Full pnpm workspaces + Turborepo monorepo covering all 13 workspaces.

**Root config:**
- `pnpm-workspace.yaml`, `turbo.json` (with remote cache)
- `tsconfig.json` with path aliases for all packages
- Shared `.eslintrc.cjs`, `prettier.config.cjs`, `.editorconfig`, `.nvmrc` (Node 20), `.gitignore`

**`packages/schema-types`** — All 9 zod schemas with inferred TypeScript types:
- `StackbySchemaGraph`, `SemanticProfile` — stack introspection contracts
- `Plan`, `DataBinding` — agent pipeline contracts
- `DesignTokens` — workspace/project token library
- `FileOperation` — discriminated union (write | delete | rename)
- `RunEvent` — discriminated union for SSE streaming (13 event types)
- `ArtifactType` — 8-variant enum
- `StudioError` — typed error shape with `{code, message, httpStatus, retryable, userMessage}`
- `READ_ONLY_COLUMN_TYPES` — Set of columns that must never be written

**`packages/sdk`, `packages/ui`, `packages/prompts`** — Scaffolded with package.json, tsconfig, src, passing smoke tests.

**`apps/studio-web`** — Next.js 14 App Router skeleton + distroless Dockerfile.

**`apps/api`** — Fastify BFF skeleton with `/health` + `/ready` + distroless Dockerfile.

**`services/*`** — All 7 services scaffolded (schema, gateway, orchestrator, build, publish, design, git) — each with Fastify skeleton, `/health`, `/ready`, passing smoke test, distroless Dockerfile.

**`infra/db`** — Drizzle ORM schema (8 tables: workspaces, workspace_members, projects, runs, artifacts, artifact_versions, design_systems, credit_ledger), `0001_initial.sql` with `ENABLE ROW LEVEL SECURITY` + isolation policies on all 7 workspace-scoped tables using `current_setting('app.current_workspace_id', true)`. Includes `withWorkspace()` helper and RLS proof test (workspace A cannot read workspace B rows).

**`docker-compose.dev.yml`** — Postgres 16, Redis 7, MinIO, ClickHouse, Temporal + Temporal UI with healthchecks.

**`.github/workflows/ci.yml`** — `install → typecheck → lint → test → build` with pnpm store cache and Turborepo remote cache.

**Result:** 98 files · 7,870 insertions · **52/52 turbo tasks green**

---

## [0.0.2] — 2026-09-01

### Added — Backend prompt library and hooks reference

- `docs/backend-prompts/C0-shared-context.md` — Canonical shared context block prepended to every backend build prompt. Defines project identity, monorepo layout, engineering standards (strict TypeScript, zod inference, typed errors, OTel, Postgres RLS, Redis), and Stackby platform constraints (PAT auth, 5 req/s/stack, 100-row pagination, 10-record write batches, read-only column set, full column type inventory).
- `docs/airtable-hooks-reference.md` — Airtable hooks library saved as reference for structural parity during Stackby SDK development.
- `lib/stackby-hooks.tsx` — Full Stackby equivalent of the Airtable hooks library. Generated into every artifact workspace. Covers `useStack`, `useRows`, `useCreateRow`, `useUpdateRow`, `useDeleteRow`, `useUploadAttachment`, `CellRenderer`, `useCurrentViewer`, `findCurrentViewerRow`, attachment utilities, CSV/TSV parsers, and a Stackby-native colour map. All data routes through the Studio Data Gateway proxy.

---

## [0.0.1] — 2026-09-01

### Added — Project foundation

- `PRD.md` — Full 16-section product requirements document synthesised from three source documents. Covers executive summary, problem statement, 6 personas, 7 product surfaces, 9 feature requirement groups, technical architecture, NFRs, analytics event taxonomy, 5-phase rollout (44 weeks to GA), team, pricing, risks, competitive analysis vs Airtable Canvas, AI agent pipeline spec, and glossary.
- `README.md` — Project overview with architecture diagram, tech stack, pricing tiers, development phases, and three core invariants.
