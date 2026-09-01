# Changelog

All notable changes to Stackby Studio are recorded here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Planned
- `apps/api` — Full BFF routes
- `apps/studio-web` — Builder UI
- `packages/ui` — Radix UI component library
- `packages/prompts` — 200+ golden eval cases

---

## [0.10.0] — 2026-09-02

### Added — `services/git` (C.10 GitHub/GitLab Integration)

GitHub App and GitLab OAuth integration for artifact export and bidirectional sync.

**Security:**
- Installation tokens stored with AES-256-GCM envelope encryption. Per-record random IV + salt derived from a 32-byte master key. Token plaintext never appears in logs or responses.
- Secret scanner runs on every file before any network call. Blocks pushes containing 10 key patterns (GitHub PAT, AWS AKIA, Stripe `sk_live_`, OpenAI `sk-`, Anthropic, private keys, generic bearer tokens, Google API keys, Stackby PAT with non-placeholder value). Returns file + line + redacted snippet — never the actual secret value.

**Export to new repository:**
- Creates repo in chosen org/group with chosen visibility
- Pushes full standalone project: `README.md`, `.gitignore`, `LICENSE`, `.env.example` (empty placeholders only), `stackby.config.json` (stack ID + table IDs, no credentials), `.github/workflows/ci.yml` (install → typecheck → lint → build), `stackby-proxy.ts` (local PAT proxy), `vite.config.ts`
- Exported project runs standalone: `pnpm install && pnpm dev` against live Stackby API with a PAT — no Studio hosting dependency

**Export to existing repository:**
- Creates a branch from the chosen base, commits the project, opens a PR/MR with generated title and body
- Read-back sync check: if the remote branch has commits Studio did not make, raises `SYNC_DIVERGED` with the diff — never overwrites silently

**Generated README sections:** artifact description, architecture diagram, data-binding table (component → table → columns → filter), environment variables, local dev steps, deployment (Vercel / Netlify), pinned `@stackby/studio-sdk` version.

**Continuous push:** `POST /git/push/:linkId` scans files, pushes to the tracked branch, updates last-pushed SHA.

**GitLab adapter:** interface-compliant stub with full production wiring notes (scopes, token refresh, project/MR API differences, self-hosted URL).

**Files:** 28 files changed · **46/46 tests passing**
- `apps/api` — Full BFF routes
- `apps/studio-web` — Builder UI
- `packages/ui` — Radix UI component library
- `packages/prompts` — 200+ golden eval cases

---

## [0.9.0] — 2026-09-02

### Added — `services/design` (C.9 Design System Extraction)

Design system extraction from brand URLs, uploaded references, and free-text notes.

**Core invariant — computed styles only:** The `DOM_EXTRACTION_SCRIPT` injected into the browser reads exclusively `window.getComputedStyle(el).color`, `.backgroundColor`, etc. It never calls `getPropertyValue()`, never reads `document.styleSheets`, never touches `--*` custom properties. Declared-but-unused CSS variables are structurally invisible to the extractor. This is enforced at two levels: (1) the script itself and (2) a `dom-script.test.ts` that asserts on the source string so it can never silently regress.

**Color clustering** (`extractor/color-cluster.ts`): sRGB → CIEXYZ → CIELAB. Samples within ΔLAB < 12 are merged (weighted by rendered pixel area). Each role — `background`, `surface`, `bodyText`, `headingText`, `link`, `buttonBg`, `buttonText`, `border`, `accent` — produces one representative hex color. `parseSamples` filters near-transparent values (a < 0.1) before clustering.

**Font extraction** (`extractor/font-extractor.ts`): walks rendered text nodes; groups by (family, role); weights by total pixel area; returns `defaultSize` and `defaultWeight` from the most-rendered combination per group.

**Outputs:**
- `DesignTokens` object with contrast warnings + accessible substitutes (hue-preserving HSL lightness adjustment)
- `tokens.css` — concrete `:root { --color-* }` properties (no `var()` references in values)
- `tailwind.preset.js` — references `var(--color-*)` so the Tailwind config couples to the token layer

**Other features:** SSE streaming extraction progress via Redis Streams; cancellable via `AbortController` map; page crawler stub (same pattern as Firecracker stub — documents Playwright wiring); sharing with `view`/`edit` roles (per-user + workspace-wide); version history with dependent project tracking; asset add/remove triggering optional re-extraction.

**Files:** 34 files changed · **47/47 tests passing**
- `services/git` — GitHub/GitLab export and bidirectional sync
- `apps/api` — Full BFF routes
- `apps/studio-web` — Builder UI
- `packages/ui` — Radix UI component library
- `packages/prompts` — 200+ golden eval cases

---

## [0.8.0] — 2026-09-02

### Added — `services/publish` (C.8 Publish and Runtime Service)

Immutable, content-addressed deployment service with Stackby SSO auth and strict security posture.

**Deployments:** `computeContentAddress(artifactId, versionId, buildHash)` → SHA-256 content address. Each publish creates a new immutable version; rollback creates a new deployment pointing to a prior version's files — no in-place mutation.

**Routing:** `{slug}.studio.stackby.com` default; custom domain with CNAME verification; Redis-cached slug → deployment lookups (60s TTL, invalidated on unpublish); ACME/Let's Encrypt stub with full production wiring notes.

**Auth (Stackby SSO):** PKCE OAuth 2.0 flow (`generatePKCE` → `buildAuthUrl` → `exchangeCode`). Session stored as HttpOnly / Secure / SameSite=Lax JWT cookie. Runtime JWT issued per-viewer, scoped to `permissionScopeHash` — never broader than the viewer's own Stackby permissions. Expired tokens fail verification.

**Visibility modes:**
| Mode | Who can see it |
|------|---------------|
| `stack_collaborators` | Authenticated Stackby stack collaborators only |
| `workspace` | Anyone in the workspace (workspace ID match) |
| `link` | Anyone with the URL |
| `password` | Anyone with the correct password (SHA-256 hash check) |
| `public` | Completely public, no auth required |

Publishing to `link` or `public` requires a `PublishConfirmation` payload enumerating tables/columns becoming readable — stored in the audit log.

**CSP (strict):** `script-src 'self'`; `connect-src 'self' {gatewayOrigin}` — no third-party egress from a published artifact. `frame-ancestors 'none'`. Per-artifact `Permissions-Policy` declares only what the artifact actually needs (camera, clipboard-read, clipboard-write, geolocation — all default-off).

**Loading state:** Single CSS spinner with `aria-hidden`; empty title tag; no visible text — zero flash of unstyled content (FR-8.5). Runtime script injected as `type="module"` with the viewer's runtime token.

**Deep links:** `GET /r/:table/:recordId` → redirect to artifact with params; runtime navigates to detail view.

**Operations:** `POST /publish/:id/rollback` + `POST /publish/:id/unpublish` + `POST /admin/force-unpublish`. Unpublish invalidates Redis cache and sets a tombstone key; propagation within 60s.

**Files:** 33 files changed · **46/46 tests passing**

---

## [0.7.0] — 2026-09-02

### Added — `services/build` (C.7 Sandboxed Build Service)

Pipeline: allowlist check → `tsc --noEmit` → ESLint → Vite build → Playwright screenshots (375/768/1440px) → DOM element map. All errors are structured `BuildError` objects with `{ phase, file, line, column, code, message, severity }`. Incremental builds diff file hashes and only re-transpile changed files. Sandbox abstraction: `ProcessSandbox` for dev/test, `FirecrackerSandbox` stub with production wiring notes (rootfs image, jailer, cgroup v2, egress firewall). Warm pool via `p-limit`. Element map extracts `data-inspect-id` bounding boxes to power Visual Edit click-to-select.

**Files:** 29 new files · **32/32 tests passing**

---

## [0.6.1] — 2026-09-02

### Added — B.0–B.13 Agent Prompt Library + expanded `packages/schema-types`

14 full agent prompt definitions in `docs/agent-prompts/`, 13 typed zod output schemas added to `packages/schema-types` (intent, clarifier, planner, codegen output, visual verifier, fixer, etc.). `packages/prompts` expanded to `PROMPT_VERSION = "1.5.0"` with 14 `build*Messages` functions and 208 tests. Every agent output schema enforces structural invariants at parse time.
- `services/publish` — Deployment, routing, custom domains (C.8)
- `services/design` — Design system extraction (C.9)
- `services/git` — GitHub/GitLab export and bidirectional sync
- `apps/api` — Full BFF routes
- `apps/studio-web` — Builder UI
- `packages/ui` — Radix UI component library
- `packages/prompts` — 200+ golden eval cases

---

## [0.6.0] — 2026-09-01

### Added — `packages/model-router` (C.6 Model Router)

Multi-provider LLM router with failover, budget enforcement, PII safety, and structured output validation.

**Config-driven tier mapping** (`config/router-config.json` — no model IDs in code):

| Tier | Label | Primary | Fallback |
|------|-------|---------|---------|
| T0 | nano | `claude-haiku-4-5-20251001` | `gpt-4o-mini` |
| T1 | fast | `claude-sonnet-5` | `gpt-4o` |
| T2 | frontier | `claude-sonnet-5` | `claude-haiku-4-5-20251001` |
| T3 | vision | `claude-opus-5` | `gpt-4o` |

**Failover:** On error or timeout, advances to the next candidate in the tier. One retry per candidate. Every attempt recorded in `MetricsTracker`. Killing the primary is fully transparent — proven by `router.test.ts` which kills the Anthropic adapter and asserts the OpenAI fallback delivers the response.

**Providers:** Anthropic (full), OpenAI (full), Google/Bedrock/Azure (interface-compliant stubs ready for credentials). Single `ProviderAdapter` interface: `call(request, candidate, apiKey) → LLMResponse`.

**Prompt caching:** Anthropic adapter marks `cacheablePrefix` as `cache_control: {type: 'ephemeral'}`. `LLMResponse` carries `cacheHit: boolean` and `usage.cacheReadTokens`. `MetricsTracker.aggregate()` reports `cacheHitRate` as a first-class metric.

**Budget enforcement:**
- Redis `INCRBYFLOAT` ledger tracks spend at run / project / workspace granularity
- `BudgetEnforcer` checks ceilings before every call; raises `BudgetExceededError` carrying `resumeInstructions` (FR-13.2)
- `BudgetExceededError.toStudioError()` produces the typed `StudioError` shape consumed by the API

**BYO keys:** `WorkspaceCredentials.providerKeys` overrides system API keys per provider. `WorkspaceCredentials.allowedProviders` filters the candidate list before routing.

**Structured output:** `callWithSchema(router, request, zodSchema, tier)` — validates JSON response; on failure appends the validation error and retries once. Proven by `structured.test.ts`: first response is malformed, second (with error context) is valid; recovery confirmed.

**Safety:** `guardPii(request)` scans message content for PII-tagged field names before any network call; raises `PIIRefusedError` immediately.

**Cost reconciliation:** `cost-reconciliation.test.ts` replays a recorded month of calls with known token counts and asserts computed cost is within 2% of expected.

**Orchestrator wired up:** `services/orchestrator/src/activities/shared/llm-router.ts` replaced with a thin `ModelRouter` wrapper. No Anthropic SDK import in the orchestrator anymore.

**Files:** 30 files changed · **34/34 tests passing**

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
