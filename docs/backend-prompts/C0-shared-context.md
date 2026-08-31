# C.0 — Shared Backend Context Block

> **Usage:** Prepend this block verbatim to every backend build prompt (C.1 onward).
> It establishes project identity, monorepo layout, and non-negotiable engineering
> standards that all generated service code must conform to.

---

```
PROJECT: Stackby Studio — an AI builder that generates React/TypeScript artifacts
(apps, reports, presentations, websites, documents) from natural-language prompts,
connected live to Stackby data, published on Stackby-hosted infrastructure with
Stackby SSO and permission inheritance, and exportable to GitHub/GitLab.

MONOREPO: pnpm workspaces + Turborepo.
  apps/studio-web        Next.js 14 (App Router) — the builder UI
  apps/api               Fastify + TypeScript — BFF / public API
  services/schema        schema introspection + semantic profiling
  services/gateway       Stackby Data Gateway
  services/orchestrator  Temporal worker — the agent pipeline
  services/build         sandboxed build + screenshot service
  services/publish       deployments, routing, domains
  services/design        design-system extraction
  services/git           GitHub/GitLab integration
  packages/sdk           @stackby/studio-sdk (published to npm)
  packages/schema-types  shared zod schemas + generated TS types
  packages/prompts       versioned agent prompts + eval harness
  packages/ui            shared React primitives

STANDARDS
- TypeScript strict everywhere. No `any`. No default exports except pages.
- All boundaries validated with zod. Types are inferred from zod, never duplicated.
- Errors are typed: {code, message, httpStatus, retryable, userMessage}. `userMessage`
  is plain language shown to end users; `message` is for logs.
- Every service exposes GET /health and GET /ready.
- OpenTelemetry tracing on every request and every agent stage.
- Postgres 16 with row-level security on every workspace-scoped table.
- Redis for cache, locks, token buckets and queues.
- Tests: Vitest for unit, Testcontainers for integration. Coverage floor 80% on
  services/gateway and services/schema (the safety-critical paths).
```

---

## Notes for prompt authors

- **Monorepo paths** in the block above match the canonical workspace layout.
  If a new package is added, update this block before writing the service prompt.
- **Coverage floor** (80%) applies only to `services/gateway` and `services/schema`
  because they are the safety-critical paths (permission enforcement and data access).
  Other services should target 60%+ but are not gated.
- **Zod inference rule** — never write a separate TypeScript `interface` or `type`
  that duplicates a zod schema. Always do `type Foo = z.infer<typeof FooSchema>`.
- **Error shape** — the four fields (`code`, `message`, `httpStatus`, `retryable`,
  `userMessage`) are required on every thrown error. `retryable` drives whether the
  Temporal orchestrator retries the activity automatically.
- **RLS** — every Postgres table scoped to a workspace must have a `workspace_id`
  column and a corresponding `ENABLE ROW LEVEL SECURITY` + policy. No exceptions.
