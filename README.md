# Stackby Canvas (Studio)

Stackby Studio is a conversational AI interface and code-generation platform built on top of Stackby. Describe what you need in plain English — Studio generates a real React/TypeScript application connected to your live Stackby data, ready to publish or export.

## What it does

- **Prompt → live app in under 4 minutes** — type a description, pick a stack, approve the plan, and get a working preview
- **Real code, real data** — generated artifacts are React 18 + TypeScript + Tailwind, backed by live Stackby rows (no fabricated values, ever)
- **You own the output** — export the full source to GitHub, deploy to a custom domain, or embed anywhere
- **Permission-safe by design** — a Data Gateway is the sole path to your Stackby credentials; published artifacts can never surface data beyond your Stackby role

## Key concepts

| Concept | Description |
|---------|-------------|
| **Stack** | A Stackby base (tables + views + automations) used as the data source |
| **Artifact** | The generated React/TS app — dashboard, portal, report, form, or gallery |
| **Run** | One agent pipeline execution from prompt to live preview |
| **Plan** | The build spec you approve before code generation starts |
| **Data Gateway** | The only service that holds Stackby credentials; all artifact data flows here |

## Artifact types

- **Dashboard** — KPI tiles, charts, tables; read-only, stakeholder-facing
- **Portal** — multi-page app with navigation, forms, and CRUD
- **Report** — printable / PDF-exportable narrative with live data
- **Form** — standalone data-entry form writing back to a Stackby table
- **Gallery** — card-grid view with filtering and search

## Architecture overview

```
Browser (Next.js 14)
    ↓ REST / SSE
API Gateway
    ↓
Project · Orchestrator · Schema · Build/Sandbox · Publish · Git
    ↓ (only path to Stackby)
Data Gateway
    ↓
Stackby API
```

The Build/Sandbox runs in a Firecracker/gVisor sandbox with no outbound network — artifacts access data exclusively via `@stackby/studio-sdk` hooks through the Data Gateway.

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, TypeScript 5, Tailwind CSS, Radix UI |
| Orchestration | Temporal |
| Sandbox | Firecracker / gVisor |
| AI routing | Multi-model T0–T3 (nano → vision) |
| Real-time | SSE (run card streaming) |
| SDK | `@stackby/studio-sdk` (React hooks: `useTable`, `useRecord`, `useView`, `useMutation`) |

## Development phases

| Phase | Weeks | Gate |
|-------|-------|------|
| Foundation | 1–8 | Internal dogfood: 20+ artifacts built |
| Alpha | 9–18 | 50 users, 80% reach preview < 4 min, NPS > 30 |
| Beta | 19–28 | 500 users, 30-day retention > 35% |
| GA Prep | 29–38 | Load test, security audit, p99 < 2s |
| GA | 39–44 | 10k weekly active builders |

## Pricing

| Tier | Price | Credits/mo |
|------|-------|------------|
| Free | $0 | 50 |
| Pro | $29/mo | 500 |
| Team | $99/mo | 2,000 |
| Enterprise | Custom | Custom |

## Core invariants

These are never violated:

1. **Zero fabricated data** — every figure rendered is a real row from the user's stack
2. **Zero permission leaks** — no user sees data their Stackby role does not allow
3. **Code ownership** — the generated source is always exportable by the user

## Build status

### Backend services

- [x] **`services/gateway`** — Data Gateway (C.3) — auth, permission isolation, coalescing cache, token bucket, stale-while-revalidate, writes, aggregation · 45 tests
- [x] **`services/schema`** — Schema Service (C.2) — introspection, semantic profiling, row sampling, type generation, drift detection · 47 tests
- [x] **`services/orchestrator`** — Temporal agent pipeline (C.5) — GenerationWorkflow (12 activities, signals, 3-cycle self-heal), 4 variant workflows, Redis Streams SSE relay · 22 tests
- [x] **`packages/model-router`** — C.6 — 5-provider router, config-driven tiers, failover, budget enforcement, PII guard, structured output retry · 34 tests
- [ ] **`services/build`** — Sandboxed build + screenshot service (C.7) — Firecracker/gVisor, 90s timeout
- [ ] **`services/publish`** — Deployments, routing, custom domains (C.8)
- [ ] **`services/design`** — Design system extraction (C.9)
- [ ] **`services/git`** — GitHub/GitLab export + sync

### API & frontend

- [ ] **`apps/api`** — BFF: project, run, artifact, credits, admin CRUD routes
- [ ] **`apps/studio-web`** — Builder UI: Home, Projects, Builder Shell, Plan Review, Preview Host, Visual Edit, Publish, Design Systems, Templates, Admin Console

### Packages

- [x] **`packages/schema-types`** — Zod schemas + inferred TS types for all service contracts
- [x] **`packages/sdk`** — `@stackby/studio-sdk` 0.1.0 — 12 hooks, Filter DSL, standalone client, `createTestClient()`, DataInspector, `eslint-plugin-stackby-studio` · 70 tests · <28KB gzipped
- [ ] **`packages/ui`** — Shared Radix UI component library
- [x] **`packages/prompts`** — B.0–B.13 agent prompt library (14 prompts, 13 builders, 208 tests) + cache-optimised assembly (`buildPrompt()`, `AGENTS`, 8 instructions) · `PROMPT_VERSION = "1.5.0"` · eval harness pending

### Infrastructure

- [x] **`infra/db`** — Drizzle ORM schema, `0001_initial.sql` migration, RLS policies on all 7 workspace-scoped tables
- [x] **`docker-compose.dev.yml`** — Postgres 16, Redis 7, MinIO, ClickHouse, Temporal + UI
- [x] **`.github/workflows/ci.yml`** — `install → typecheck → lint → test → build` with turbo remote cache

### Reference docs

- [x] **`docs/agent-prompts/B0-shared-preamble.md`** — Shared preamble prepended to every agent prompt (invariants, context slots, platform facts)
- [x] **`docs/agent-prompts/B1-intent-analyst.md`** — Stage 1: free-form request → structured intent object (goal, artifact type, capabilities, ambiguities)
- [x] **`docs/agent-prompts/B2-schema-analyst.md`** — Stage 2: intent + schema graph + sampled rows → table roles, semantic profile, candidate bindings, data-quality warnings
- [x] **`docs/agent-prompts/B3-clarifier.md`** — Stage 3: earn at most 3 questions (structural-only gate) or skip to assumptions; exactly one recommended option per question
- [x] **`docs/agent-prompts/B4-planner.md`** — Stage 4: pages → sections → bindings → visual direction; binding_ref cross-reference enforced at parse time
- [x] **`docs/agent-prompts/B5-designer.md`** — Stage 5: visual_direction → full token set (light + dark), layout grammar, WCAG contrast report
- [x] **`docs/agent-prompts/B6-code-generator.md`** — Stage 6: write/patch/delete file ops; path-traversal guard, write+delete conflict check, stackby.config.json protected
- [x] **`docs/agent-prompts/B7-visual-verifier.md`** — Stage 7: multimodal; screenshots → pass/fix/fail verdict; pass+blocker enforced at parse time; typed VerifierMessagePart for orchestrator
- [x] **`docs/agent-prompts/B8-fixer.md`** — Stage 8: targeted repair ops + resolved/unresolved report; id overlap guard; inherits all CodeGen path-safety rules
- [x] **`docs/agent-prompts/B9-summariser.md`** — Stage 9: run trace → headline (≤8 words enforced), steps, verdict line, what changed, ≤2 suggested next prompts
- [x] **`docs/agent-prompts/B10-visual-edit.md`** — Out-of-pipeline: direct-manipulation change → minimal source patch; 6% token-snap rule; token_used/token_proposed mutual exclusion enforced
- [x] **`docs/agent-prompts/B11-annotation-edit.md`** — Out-of-pipeline: pin-comment annotations → per-annotation applied/needs_input/conflicts_with_plan; duplicate id guard; validateAnnotationCoverage helper
- [x] **`docs/agent-prompts/B12-stack-generator.md`** — Out-of-pipeline: natural language → full Stackby stack; forward-reference guard, column ordering, duplicate key/row checks, hex color validation
- [x] **`docs/agent-prompts/B13-template-remap.md`** — Out-of-pipeline: template schema → field mappings with confidence/basis; create_column vs ask_user; ≤3 questions; proposed_column mutual exclusion
- [x] **`docs/backend-prompts/C0-shared-context.md`** — Shared context prepended to every backend prompt
- [x] **`docs/airtable-hooks-reference.md`** — Airtable hooks library reference
- [x] **`lib/stackby-hooks.tsx`** — Stackby hooks library (generated into every artifact workspace)
- [x] **`PRD.md`** — Full product requirements document

## Documentation

Full product specification: [PRD.md](./PRD.md)  
Changelog: [CHANGELOG.md](./CHANGELOG.md)

## Contributing

See the PRD for feature requirements, architecture decisions, and rollout plan before picking up work. Backend prompts for each service live in `docs/backend-prompts/`.
