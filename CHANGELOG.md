# Changelog

All notable changes to Stackby Studio are recorded here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Planned
- `services/orchestrator` — Temporal agent pipeline (C.5)
- `services/build` — Firecracker/gVisor sandboxed build service (C.7)
- `services/publish` — Deployment, routing, custom domains (C.8)
- `services/design` — Design system extraction from rendered styles (C.9)
- `services/git` — GitHub/GitLab export and bidirectional sync
- `apps/api` — Full BFF with project, run, artifact, credits, admin routes
- `apps/studio-web` — Builder UI (Home, Builder Shell, Plan Review, Preview Host, Visual Edit, Publish, Admin)
- `packages/sdk` — `@stackby/studio-sdk` full React hooks implementation
- `packages/ui` — Shared Radix UI component library
- Eval harness — 200+ golden cases for `packages/prompts`

---

## [0.4.0] — 2026-09-01

### Added — B.0–B.13 Agent Prompt Library (`packages/prompts` + `packages/schema-types`)

Full implementation of the Stackby Studio agent prompt library: 14 prompt definitions
(B.0–B.13), 14 typed zod output schemas, 13 `build*Messages` functions for composing
LLM calls, and 208 test cases across two packages. `PROMPT_VERSION = "1.4.0"`.

**Prompt docs (`docs/agent-prompts/`)**

| ID | Stage | Role |
|----|-------|------|
| B.0 | Shared preamble | Invariants, context slots, Stackby platform facts — prepended to every agent |
| B.1 | Intent Analyst | Free-form request → structured intent (goal, artifact type, capabilities, ambiguities) |
| B.2 | Schema Analyst | Intent + schema graph + sampled rows → table roles, semantic profile, candidate bindings, data-quality warnings |
| B.3 | Clarifier | Earn at most 3 structural questions (three-part gate); exactly one recommended option per question |
| B.4 | Planner | Pages → sections → bindings → visual direction; binding_ref cross-reference enforced at parse time |
| B.5 | Designer | visual_direction → full token set (light + dark), layout grammar, 8 chart colours, WCAG contrast report |
| B.6 | Code Generator | write/patch/delete file ops; path-traversal guard, write+delete conflict, `stackby.config.json` protected |
| B.7 | Visual Verifier | Multimodal; screenshots → pass/fix/fail verdict; pass+blocker enforced at parse time; typed `VerifierMessagePart` |
| B.8 | Fixer | Targeted repair ops + resolved/unresolved report; id overlap guard; inherits all CodeGen path-safety rules |
| B.9 | Summariser | Run trace → headline (≤8 words), steps, verdict line, what changed, ≤2 suggested next prompts |
| B.10 | Visual Edit | Direct-manipulation change → minimal source patch; 6% token-snap; `token_used`/`token_proposed` mutual exclusion |
| B.11 | Annotation Edit | Pin-comment annotations → per-annotation applied/needs_input/conflicts_with_plan; `validateAnnotationCoverage` helper |
| B.12 | Stack Generator | Natural language → full Stackby stack; forward-reference guard, column ordering, duplicate key/row checks |
| B.13 | Template Remap | Template schema → field mappings with confidence/basis; create_column vs ask_user; ≤3 questions |

**New zod schemas (`packages/schema-types/src/schemas/`)**

- `intent.ts` — `IntentSchema`, `CapabilitySchema`, `IntentArtifactTypeSchema`, `AmbiguitySchema`
- `schema-analysis.ts` — `SchemaAnalysisSchema`, `CandidateBindingSchema` (5,000-row cap enforced), `DataQualityWarningSchema`
- `clarifier.ts` — `ClarifierOutputSchema` with `superRefine` enforcing exactly-one-recommended per question
- `planner-output.ts` — `PlannerOutputSchema` with binding_ref cross-reference and design_system coherence checks
- `designer-output.ts` — `DesignerOutputSchema`, `TokenSetSchema` (chart array length=8 enforced), radius literal constraints
- `codegen-output.ts` — `CodeGenOutputSchema` with path-traversal guard, write+delete conflict, config file protection
- `visual-verifier.ts` — `VisualVerifierOutputSchema` (pass+blocker rejected), `VerifierMessagePartSchema` (protocol-neutral image parts)
- `fixer-output.ts` — `FixerOutputSchema` with resolved/unresolved overlap guard; accepts empty operations
- `summariser-output.ts` — `SummariserOutputSchema` with 8-word headline `superRefine`, `artifact_uri` URL validation
- `visual-edit.ts` — `VisualEditInputSchema`, `VisualEditOutputSchema` (`token_used`/`token_proposed` mutual exclusion)
- `annotation-edit.ts` — `AnnotationEditOutputSchema` (duplicate id guard), `validateAnnotationCoverage` helper
- `stack-generator.ts` — `StackGeneratorOutputSchema` (forward-reference guard, column ordering, duplicate key/row checks, hex color)
- `template-remap.ts` — `TemplateRemapOutputSchema` (`create_column`/`asked_user` mutual exclusion, ≤3 questions, duplicate id guard)

**`packages/prompts` builders**

Each builder composes `B0_PREAMBLE + B{n}_BODY` as the system prompt and XML-escapes
all user-controlled context slots into a typed user message:

`buildIntentMessages` · `buildSchemaAnalystMessages` · `buildClarifierMessages` ·
`buildPlannerMessages` · `buildDesignerMessages` · `buildCodeGeneratorMessages` ·
`buildVisualVerifierMessages` (returns `{system, userParts: VerifierMessagePart[]}`) ·
`buildFixerMessages` · `buildSummariserMessages` · `buildVisualEditMessages` ·
`buildAnnotationEditMessages` · `buildStackGeneratorMessages` · `buildTemplateRemapMessages`

**Test counts:** 44 schema-types · 208 prompts (all passing)

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
