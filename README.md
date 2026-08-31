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

## Documentation

Full product specification: [PRD.md](./PRD.md)

## Contributing

See the PRD for feature requirements, architecture decisions, and rollout plan before picking up work.
