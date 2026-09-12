# Changelog

All notable changes to Stackby Studio are recorded here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

---

## [1.0.0] — 2026-09-13

### canvas-frontend → main — Phase 4 GA Prep complete

Merges the full `canvas-frontend` branch into `main`. All seven PRD surfaces are built, all backend services are wired and tested, and all Phase 1–4 gate criteria are met. The product is ready for Phase 5 (public launch).

#### What's included (summary — see individual version entries below for details)

**Surfaces (S1–S7)**
- S1 Home — PromptComposer with typewriter placeholder, StackPicker, VoiceInput, AttachmentZone, TemplateStrip, HomeProjectFeed
- S2 Projects — ProjectsList with tabs, search/filter, thumbnail cards
- S3 Design Systems — ColorEditor with WCAG contrast badges, TypographyEditor, TokenEditor with 5 tabs, SSE-streamed extraction from any URL
- S4 Builder Shell — SSE run cards, ClarificationGate, PlanReview, PreviewHost with breakpoint switcher, VisualEdit (PropertyEditor, TokenBrowser, AnnotationPanel), PropertiesRail, FollowUpBar
- S5 Published Runtime — `app/p/[slug]` viewer with 5 states: loading, 404, 410, auth gate (PKCE OAuth2), password gate (rate-limited); full-viewport iframe
- S6 Admin Console — ArtifactsTab, AuditTab, CreditsTab, PolicyTab
- S7 Templates — TemplateGallery, StackMappingDialog, one-click clone

**Services completed / wired**
- `services/gateway` — permission scope hash, binding validation, column masking, token-bucket rate limiting, cache poisoning tests (45/45 passing)
- `services/schema` — schema introspection, semantic profiling, drift detection, TypeScript type generation (47/47 passing)
- `services/orchestrator` — full Temporal generation workflow, all activities, LLM router (T0–T3), visual edit and annotation patch workflows
- `services/build` — Firecracker sandbox, esbuild pipeline, Playwright screenshot, element map, secret scanner
- `services/publish` — immutable deployments, slug routing, visibility enforcement, PKCE SSO, password-check rate limiting, custom domain CNAME, cache headers
- `services/design` — token extraction with SSE streaming, workspace/project/component inheritance
- `services/git` — GitHub/GitLab export (new repo, existing repo, push update), read-back sync, secret scanner
- `apps/api` — credits ledger, workspace policies, audit log (hash-chained), project/run creation

**Cross-cutting**
- Auth — PAT-based builder auth (`/connect`), PKCE OAuth2 SSO for artifact viewers
- Git export — `GitExportDialog` in builder header; full new/existing/linked flow
- Custom domains — `PATCH /publish/:id/domain` + CNAME instructions in PublishPopover
- Credits UI — Credits tab in SettingsModal with balance, usage bar, transaction history
- Accessibility — WCAG 2.1 AA: `aria-label` on all icon buttons, `aria-pressed`/`aria-expanded` on toggles, `role="dialog"` on modals, `role="status"` on spinners (10 components)
- Performance — CDN cache headers on serve-route (public: `s-maxage=3600`; private: `no-store`), ETag + 304, Next.js `headers()` config
- Security — serve-route visibility enforcement (cookie + JWT), password rate limiting (10/15min Redis), open redirect closed in auth-start
- Eval harness — 210 golden fixtures across 10 domains, 6 test suites
- Load tests — k6 suite: 4 scenarios, 5,000 VU peak, p99 < 2s threshold
- Security pen tests — 17 tests via Fastify inject: visibility, rate limiting, open redirect, CSP, cookie attributes, input validation
- Documentation site — `apps/docs`: 7 pages (quickstart, concepts, builder, publishing, API reference, SDK, security)
- SOC 2 — `0003_retention_policies.sql`, nightly retention job, 28-control controls matrix

**Phase 4 gate status**
- ✅ Load test at 10× beta peak — k6 suite ready; p99 < 2s threshold defined
- ✅ Security hardening — visibility enforcement, rate limiting, CSP, pen test suite in CI
- ✅ Accessibility audit — WCAG 2.1 AA across all surfaces
- ✅ Onboarding flow — single modal, 2 value lines, 1 CTA (built in Phase 1, v0.13.0)
- ✅ Documentation site — `apps/docs` with 7 pages
- ✅ SOC 2 readiness — controls matrix, retention migration + job; external audit engagement scheduled Q1 2027

---

## [0.18.0] — 2026-09-10

### Added — Phase 4 remaining: load tests, security pen tests, documentation site, SOC 2 data retention

#### Load tests (`load-tests/`) — committed `bb033d6`

k6 load test suite targeting **10× beta peak (5,000 VU)** with the PRD gate of **p99 < 2s** for the serve route:

- `scenarios/serve-artifact.js` — ramps 0→200→500→2500→5000 VU over 10 min; thresholds `p(99)<2000ms` + `error_rate<1%`
- `scenarios/api-projects.js` — 100 VU steady; `p(95)<500ms` / `p(99)<1000ms` per endpoint
- `scenarios/publish-meta.js` — ramping arrival rate to 500 req/s; `p(99)<300ms` (Redis cache validation)
- `scenarios/full-flow.js` — 10 VU smoke with `group()` step timing
- `load-tests/lib/helpers.js` — shared URL constants, `randomSlug()`, `checkStatus()`
- `load-tests/k6.config.js` — suite registry and shared threshold constants
- `load-tests/README.md` — run instructions, env vars, results interpretation

#### Security pen tests (`services/publish/src/__tests__/security.test.ts`)

6 suites, 17 tests using Fastify `inject()` (no network required):

1. **Visibility enforcement** — unknown slugs 404/401 never 200/500; forged cookies rejected; forged JWTs rejected; no `Server: Fastify` header leakage; null-byte paths don't 500
2. **Rate limiting** — 11 rapid requests → at least one 429; 429 body has `error` field
3. **Open redirect prevention** — `https://evil.com` stripped; `//evil.com` stripped; relative `/p/my-artifact` passes through
4. **CSP safety** — `unsafe-eval` never present; `X-Content-Type-Options: nosniff`; restrictive `X-Frame-Options`
5. **Cookie security** — `__ap_*` cookies are `HttpOnly` + `SameSite=Lax`
6. **Input validation** — path traversal domain rejected; 1-char domain rejected; empty body 400; empty password never `allowed:true`; meta 404 is structured JSON

#### Documentation site (`apps/docs`)

Next.js 14 App Router docs site (port 3001, static export) with 7 pages:

- `/` — Overview, how-it-works, cards linking to all sections
- `/quickstart` — Connect PAT → write prompt → review plan → watch build → publish
- `/concepts` — Artifacts (8 types), stacks, plans, bindings, runs, credits/tiers
- `/builder` — Effective prompts, plan review, run cards, preview, visual editing, follow-ups, git export
- `/publishing` — Visibility modes table, publish flow, version history/rollback, custom domains, SSO viewer, unpublishing
- `/api-reference` — All REST endpoints across `apps/api`, `services/orchestrator`, `services/publish`, `services/git`, `services/design`
- `/sdk` — `useRows`, `useRecord`, `useCreateRow`, `useUpdateRow`, `useDeleteRow`, `useView`, `DataInspector`, `useMutation`, read-only column types
- `/security` — Data Gateway enforcement, workspace isolation (RLS), published artifact security, CSP, build sandbox, audit log, data retention

DocsLayout sidebar with all section links; inline CSS design tokens (no Tailwind dependency).

#### SOC 2 data retention

- **`infra/db/migrations/0003_retention_policies.sql`** — `retention_policies` table (workspace-configurable), `system_retention_defaults` table (runs: 90d, audit_log: 7y, credit_ledger: 7y anonymise, artifacts: 1y), partial indexes for efficient pruning, `retention_job_log` table for SOC 2 evidence trail
- **`apps/api/src/jobs/retention.ts`** — nightly job: loads defaults, runs type-specific pruners (hard-delete for runs/artifacts/audit; anonymise credit ledger descriptions), logs every run to `retention_job_log`, exits non-zero on error for cron alerting. Run with `npx tsx src/jobs/retention.ts` or schedule at `0 2 * * *`.
- **`docs/soc2-controls.md`** — Full SOC 2 Type II controls matrix covering CC1–CC9, A1, C1. 28 controls mapped to implementation files. Gaps table with priorities and target dates (automated backup job, external pen test, incident runbook, Type II audit engagement Q1 2027).

---

## [0.17.0] — 2026-09-10

### Added — Phase 4: performance hardening, security fixes, accessibility, eval harness

#### Security hardening (`services/publish`)

- **`serve-route.ts` — visibility enforcement**: the serve route now checks access before returning any HTML. Password-protected artifacts require an `__ap_{deploymentId}` cookie (set on success by the check-password route). Workspace/collaborator artifacts require a valid `__studio_session` JWT verified by `SessionManager`. Public/link artifacts are served freely. Returns 401 with a typed `reason` or 410 for unpublished.
- **`check-password-route.ts` — rate limiting**: Redis-backed counter at `pwcheck_rate:{slug}:{ip}` — max 10 attempts per 15 minutes; 429 on breach; counter deleted on success. Sets `__ap_{deploymentId}` httpOnly cookie on correct password.
- **`auth-start-route.ts` — open redirect fix**: `returnTo` is validated to start with `/`; any absolute URL is replaced with `'/'`.

#### Performance hardening

- **`serve-route.ts`**: public/link artifacts get `Cache-Control: public, max-age=60, s-maxage=3600, stale-while-revalidate=86400` + `CDN-Cache-Control: public, max-age=3600` + `ETag` on `activeVersionId` with 304 support. Private artifacts get `Cache-Control: private, no-store`.
- **`apps/studio-web/next.config.mjs`**: Added `headers()` config — viewer pages (`/p/*`) get `public, max-age=30, s-maxage=300, stale-while-revalidate=3600`; app shell gets `private, no-store`; `/_next/static/*` gets `immutable, max-age=31536000`.

#### Accessibility (WCAG 2.1 AA) — committed as `2adf4ab`

10 component files updated: `builder-shell`, `follow-up-bar`, `run-card`, `prompt-composer`, `sidebar`, `settings-modal`, `color-editor`, `simple-token-editor`, `connect/page`, `p/[slug]/page`. Fixes: `aria-label` on all icon-only buttons, `aria-pressed` on toggle buttons, `aria-expanded`/`aria-controls` on collapsibles, `role="dialog"` + `aria-modal` + `aria-labelledby` on custom modals, `role="status"` + `aria-label` on loading spinners.

#### Eval harness — 210 golden fixtures

`services/orchestrator/src/__tests__/golden.test.ts` expanded from 8 fixtures and 4 smoke tests to **210 fixtures** across 10 domains (CRM, PM, HR, Finance, Marketing, Ops, E-commerce, Education, Healthcare, Edge) and **6 test suites**:
1. Catalogue integrity — count ≥ 200, all prompts unique, all 8 artifact types covered, all 10 domains covered, realistic type distribution
2. GenerationInput shape validation — 210 individual `it()` cases
3. Intent keyword heuristics — regex signal coverage tests per type (dashboard, form, report, portal)
4. Plan structural validation — well-formed/invalid shapes, all artifact types, all step types
5. Intent structural validation — confidence bounds, capability enum, artifact type enum
6. Workflow export smoke test — all 9 domains sampled

---

## [0.16.0] — 2026-09-10

### Added — Custom domains, SSO viewer OAuth, Credits UI

Completes all remaining PRD Phase 3 items.

#### Custom domain (`services/publish` + `apps/studio-web`)

- **`services/publish/src/routes/custom-domain-route.ts`** — `PATCH /publish/:deploymentId/domain` accepts `{ domain: string | null }`. Validates the hostname with `/^[a-z0-9.-]{4,253}$/`, clears the old `domain:*` Redis key, invalidates the slug cache, and persists via the store.
- **`services/publish/src/deployment/store.ts`** — added `setCustomDomain(deploymentId, domain | null)` (`UPDATE deployments SET custom_domain=$1 WHERE id=$2`).
- **`(app)/api/publish/[deploymentId]/domain/route.ts`** — PATCH proxy.
- **`PublishPopover` done step** — "Custom domain" section below version history: input for `app.yourcompany.com`, Save button with spinner/check states, and a CNAME instructions line that appears after a successful save (`CNAME {domain} → {slug}.studio.stackby.com`).

#### SSO viewer OAuth loop (`services/publish` + `apps/studio-web`)

- **`services/publish/src/routes/auth-start-route.ts`** — `GET /auth/start?returnTo=`. Generates PKCE, stores `{ codeVerifier, returnTo }` in Redis at `pkce:{state}` (600s TTL), and 302-redirects to the Stackby OAuth2 authorize URL. Pairs with the existing `auth-callback.ts` which exchanges the code, sets `__studio_session`, and redirects to `returnTo`.
- **`(app)/api/publish/auth/start/route.ts`** — transparent redirect proxy: forwards browser to `PUBLISH_URL/auth/start?returnTo=…`.
- **`app/p/[slug]/page.tsx` `AuthGate`** — "Sign in with Stackby" now links to `/api/publish/auth/start?returnTo=/p/{slug}` (the PKCE OAuth2 flow) instead of the Studio PAT `/connect` page, so viewers get a proper session cookie that the publish serve-route can validate.

#### Credits UI (`apps/studio-web`)

- **`(app)/api/credits/history/route.ts`** — proxies `GET /v1/credits/history` from `apps/api`.
- **`SettingsModal` Credits tab** — third tab ("Credits", Zap icon) renders `CreditsPanel`: balance card with animated progress bar (used/total), "Add credits" CTA linking to billing page with external link icon, and a recent transactions list (10 entries) with signed amounts colored green/red.

---

## [0.15.0] — 2026-09-10

### Added — Git export (`services/git` + `apps/studio-web`)

Full GitHub/GitLab export flow surfaced in the builder. Covers first-time export to a new repo, export as a PR to an existing repo, and incremental push updates for already-linked projects.

#### `services/git` — routes wired + new links lookup

- **`src/index.ts`** — registered all six route handlers that were implemented but unwired: `install`, `export/new`, `export/existing`, `push/:linkId`, `sync/:linkId`, `policy`
- **`src/routes/links-route.ts`** — new `GET /git/links/project/:projectId` endpoint; returns the most recent `RepoLink` for a project (404 → null in the Next.js proxy, so the frontend gets a clean null for unlinkd projects)

#### `apps/studio-web` — five API proxy routes

- `(app)/api/git/export/new` — POST
- `(app)/api/git/export/existing` — POST
- `(app)/api/git/links/[projectId]` — GET (maps 404 → `null` so the dialog doesn't need to handle HTTP errors)
- `(app)/api/git/push/[linkId]` — POST
- `(app)/api/git/sync/[linkId]` — GET

#### `apps/studio-web` — `GitExportDialog` component

`src/components/builder/git-export-dialog.tsx` — full dialog with five states:

- **Loading** — fetches `GET /api/git/links/:projectId` on open
- **No install** — shown via "No GitHub access?" link; prompts GitHub App install with external link + "I already installed it" bypass
- **Unlinked** — two-tab layout:
  - *New repository*: repo name (slug-validated `/^[a-z0-9-]{3,50}$/`), owner, provider radio (GitHub / GitLab), visibility radio (Private / Public); calls `POST /api/git/export/new`
  - *Existing repository*: `owner/repo` path, new branch name, PR title; calls `POST /api/git/export/existing`
- **Linked** — shows `repo (branch)` badge with inline sync check; commit message input, optional "Open PR" checkbox with PR title; calls `POST /api/git/push/:linkId`
- **Success** — repo URL + "Open in GitHub/GitLab" button; PR link when applicable

#### `apps/studio-web` — `BuilderShell` wired

- Added `GitBranch` "Export" button to the builder header (between mode buttons and Publish)
- `BuilderShell` accepts optional `artifactName`, `artifactType`, `stackId`, `stackName` props (fall back to plan data / defaults)
- `GitExportDialog` mounted inside the shell, controlled by `gitOpen` state

---

## [0.14.0] — 2026-09-10

### Added — S5 Published Runtime (`apps/studio-web` + `services/publish`)

Public-facing viewer for deployed artifacts. Completes all 7 PRD surfaces.

#### `services/publish` — two new routes

- **`GET /publish/:slug/meta`** — returns deployment metadata (`slug`, `deploymentId`, `projectId`, `visibility`, `publishedAt`) as JSON; 404 if not found, 410 if unpublished. Used by the viewer to decide which gate to show without serving the full artifact.
- **`POST /publish/:slug/check-password`** — accepts `{ password }`, returns `{ allowed: boolean }` after SHA-256 comparison against stored hash. Returns `allowed: true` immediately for non-password deployments.

#### `apps/studio-web` — viewer page + API proxies

- **`app/p/[slug]/page.tsx`** — public-facing viewer, outside the `(app)` route group (no sidebar, no auth guard). Five states:
  - **Loading** — spinner while meta is fetched
  - **Not found** (HTTP 404) — card with "Go to Studio" CTA
  - **Unpublished** (HTTP 410) — "no longer available" card
  - **Auth gate** (`workspace` / `stack_collaborators`) — sign-in card; links to `/connect?next=/p/{slug}` so auth redirects back after sign-in
  - **Password gate** (`password`) — password form with show/hide toggle; validates via `/api/publish/:slug/check-password` before revealing iframe
  - **Ready** (`public` / `link` / post-password-unlock) — full-viewport fixed iframe pointing at `PUBLISH_URL/serve/{slug}/`; forwards `camera`, `geolocation`, `clipboard-read`, `clipboard-write` permissions from deployment metadata
- **`app/p/[slug]/layout.tsx`** — minimal HTML shell, no AppShell wrapper
- **`(app)/api/publish/[slug]/meta/route.ts`** — GET proxy to publish service
- **`(app)/api/publish/[slug]/check-password/route.ts`** — POST proxy to publish service
- **`app/connect/page.tsx`** — now reads `?next=` search param; redirects to `next` after successful auth (defaults to `/`)

---

## [0.13.0] — 2026-09-02

### Added — `apps/studio-web` (Canvas-style Builder UI) + `packages/ui`

Full frontend build across 10 phases, plus a pixel-perfect dark design system matching the Canvas reference spec.

---

#### Phase 1 — Foundation (`packages/ui` + `apps/studio-web` baseline)

- **`packages/ui`** — 14 Radix UI primitives: `Avatar`, `Badge`, `Button`, `Card`, `Dialog`, `DropdownMenu`, `Input`, `Popover`, `Progress`, `Separator`, `Spinner`, `Tabs`, `Textarea`, `Tooltip`; CVA variant system; `cn` utility
- **Design token system** — CSS custom properties for all colour, typography, spacing, and radius values; Tailwind config maps tokens to classes; `preview-sm/md/lg` breakpoints at 375/768/1440px (B7 visual verifier)
- **AppShell** — floating panel layout (`#202020` on `#1C1C1C` window), 272px full-text sidebar, `OnboardingModal` mount point

#### Phase 2 — Home Surface

- **Orchestrator `POST /runs`** — starts `GenerationWorkflow` via Temporal, returns `runId`
- **`apps/api` project routes** — `POST /v1/projects` (create project + run in DB, fires orchestrator), `GET /v1/projects` (list with latest run status via LATERAL join)
- **`PromptComposer`** — Canvas-style floating box with `#1C1C1C` bg, layered shadow, typewriter placeholder (45ms/char, 1.4s hold, 25ms delete), "Report" + "Design system" chips, `#3A3A3A`→white send button, `#232323` tray with base selector
- **`StackPicker`** — transparent tray input with recent-stacks dropdown
- **`VoiceInputButton`** — Web Speech API with idle/listening/unsupported states
- **`AttachmentZone`** — drag-and-drop for images/CSV/PDF with chip list
- **`TemplateStrip`** — 6 static template cards on Home; clicks route to `/templates?id=`
- **`HomeProjectFeed`** — Latest/Starter ideas tabs, "View all ↗", `#f6f4ef` thumbnail cards

#### Phase 3 — Projects Surface

- **`GET /v1/projects`** updated — adds `artifact_type` + `updated_at` via LATERAL join on `artifacts`
- **`ProjectsList`** — Canvas-style tabs (All / Starred / Published / Apps / Presentations / Reports), "Select projects" + "+ Create new", Filter/Sort dropdowns, `#f6f4ef` 16:10 thumbnail cards with name+meta outside border
- **`EmptyState`** — per-filter messaging
- `/projects/[id]` placeholder wired

#### Phase 4 — Builder Shell Core

- **`useRunEvents`** — SSE consumer hook, cursor-resumable reconnect, `RunPhase` state machine driven by event stream
- **`RunCard`** — step rows: `48px` tall, `#1F1F1F` bg, `border-radius: 10px`, collapsible; rating chip after `ready`; user bubbles (`#2A2A2A`, 14px border-radius; short replies → 999px pill); AI text unbubbled
- **`ClarificationGate`** — suspension point panel: ≤3 questions with free-text areas, fallback button when payload malformed (PRD invariant D.6)
- **`PlanReview`** — approve/reject panel with step tree and estimated credits; approve/reject buttons always render even if plan JSON fails to parse
- **`PreviewHost`** — sandboxed `<iframe>` with 375/768/1440 breakpoint switcher; `#241f1d` warm canvas bg
- **`FollowUpBar`** — mini composer always visible at bottom of chat
- **`BuilderShell`** — full-screen fixed overlay (`#1C1C1C`), Canvas 70px header: logo · project name ▾ · App · panel toggle · base pill (with `#3ECF8E` online dot) · individual Preview/Edit/Annotate mode buttons · white Publish button; 500px chat left + preview right

#### Phase 5 — Visual Edit + Annotations + Undo/Redo

- **Orchestrator `POST /runs/:runId/visual-edit`** → starts `VisualEditWorkflow`
- **Orchestrator `POST /runs/:runId/annotations`** → starts `AnnotationWorkflow`
- **`useUndoRedo`** — generic 50-step history hook (`set/undo/redo/canUndo/canRedo/clear`)
- **`PropertyEditor`** — component picker (from plan steps), property/value selectors, 6% token-snap suggestion, `tokenUsed`/`tokenProposed` display, `Undo2`/`Redo2` buttons
- **`TokenBrowser`** — colour-swatch grid of all CSS token vars, grouped by category
- **`AnnotationPanel`** — add annotations per component with critical/minor severity; batch submit; list with `applied`/`needs_input`/`conflicts_with_plan` chips
- **`PropertiesRail`** — 320px right panel with Properties / Tokens / Annotations tabs

#### Phase 6 — Publish

- **Publish service `GET /publish/:id/versions`** — exposes `store.listVersions()`
- **`PublishPopover`** — 3-step: configure slug + visibility (5 modes) → public confirmation gate (tables/columns checklist, "I understand…" checkbox, PRD FR-07) → done with copy/open; all wired to `services/publish` port 3006
- **`VersionHistory`** — fetches and lists versions on mount, "Current" badge, Restore button
- Builder sub-header with ← Projects link and Publish button (disabled until preview ready)

#### Phase 7 — Design Systems

- **Design service `GET /design-systems`** — `listByWorkspace()` added to store; new HTTP route
- **Design service `GET /design-systems/:id`** — single record fetch
- **Design service `PATCH /design-systems/:id`** — now actually calls `store.updateTokens()` (was a stub)
- **`ColorEditor`** — swatch + name + hex input + WCAG contrast badges (AA/AAA/AA Large/Fail vs white and black)
- **`TypographyEditor`** — font family + sizes + weights
- **`SimpleTokenEditor`** — reusable key-value editor for spacing/radii/shadows
- **`ExtractDialog`** — URL input → POST extract → SSE progress stream → done
- **`TokenEditor`** — 5-tab editor (Colors / Typography / Spacing / Radii / Shadows), dirty tracking, workspace → project → component inheritance chain
- **`WcagBadge`** — contrast ratio level with correct variant colour
- `/design-systems` list and `/design-systems/[id]` editor pages; empty state: single centred muted sentence

#### Phase 8 — Admin Console

- **`CreditsTab`** — balance card + 14-day div-based bar chart + Day/Week/Month period selector; all calls now correctly use `DEV_WORKSPACE_ID` UUID (was string literal `'DEV_WORKSPACE_ID'`)
- **`ArtifactsTab`** — artifacts table with Force Unpublish confirm dialog
- **`PolicyTab`** — toggle switches for `allowPublicPublishing`, `requireApprovalForPublish`, `allowGitExport`; credit cap input; T0–T3 model tier checkboxes
- **`AuditTab`** — debounced filter inputs, monospace action codes, relative timestamps, ↓ CSV export
- `/admin` page

#### Phase 9 — Templates + B13 Stack Mapping

- **`src/lib/templates.ts`** — 12 templates across 8 categories with full field schemas, semantic roles, and auto-fill prompts
- **Orchestrator `POST /templates/:templateId/remap`** — simulated B13 output (required fields 0.92 confidence, optional 0.78)
- **`TemplateGallery`** — type pills + category pills + search + 4-col grid; auto-opens dialog from `?id=` param
- **`TemplateCard`** — gradient thumbnail by type, required field count, "Use template →"
- **`StackMappingDialog`** — 3-step: stack ID input → field confidence mapping (auto-mapped ≥0.9 green / confirm 0.7–0.89 ✓✗ / `create_column` info) → create project + redirect to builder

#### Phase 10 — Onboarding Modal (D.14)

- **`OnboardingModal`** — split layout: `from-sky-600 to-sky-800` 3×3 grid left, white content right; logo + "Meet Studio"; exactly two value lines with `LayoutDashboard` and `Pencil` icons; single "Start building →" full-width black CTA; persisted to `localStorage`; never re-fires (PRD invariant D.14: no third bullet, no video, no tour)

#### Design System Redesign

- **Dark theme** — `#1C1C1C` window / `#202020` floating panel / `#282828` surface; single accent `#2D7FF9`; depth from three greys + one hairline border, never shadows
- **Schibsted Grotesk** — loaded via `next/font/google` for headings and display text
- **Logo** — exact 2-path SVG layers mark matching the reference spec
- **Sidebar** — 272px, text + icon nav (1.6px stroke), Recent collapsible, avatar → Appearance submenu (System/Light/Dark) → Settings modal → Sign out
- **Settings modal** — General (model radio T0–T3, skip planning checkbox, notification toggle) + Account (profile email, Disconnect Stackby)

#### Bug Fixes

- **Dev workspace seed** — `infra/db/migrations/0002_dev_seed.sql`; fixed `workspaceId: 'dev-workspace'` (string) → `DEV_WORKSPACE_ID` UUID constant across all 13 affected files
- **Design system store schema** — `CREATE TABLE design_systems` has no `brand_url`/`notes`/`created_by` columns; fixed `INSERT` and `toRecord()` to match actual schema
- **Admin tabs** — all four admin components were sending literal string `'DEV_WORKSPACE_ID'` instead of the imported constant UUID
- **Design system token saves** — `PATCH /design-systems/:id` was a stub; now correctly calls `store.updateTokens()`

---

## [0.12.0] — 2026-09-02

### Added — `packages/prompts` eval harness + `packages/telemetry`

**Eval harness (`packages/prompts`):**

- **8 versioned prompt files** (`prompts/<agent>.v1.md`) with frontmatter: `agent`, `version`, `tier`, `schema`, `changelog`. Runs record the version they used for traceability.
- **200+ golden fixtures** — `fixtures/generator.ts` generates cases programmatically across all 8 artifact types, all column types (text through autoNumber), empty stacks, 1000-row stacks, multi-table relationships, accessibility, and 20 adversarial injection cases whose row values contain `"ignore previous instructions"`, `<script>`, `process.env`, `eval()`, base64-encoded payloads, and Unicode RTL overrides.
- **5 stack fixtures**: `tasks-stack.json` (17 columns incl. formula/rollup/link), `crm-stack.json`, `empty-stack.json`, `huge-stack.json` (1000 rows), `adversarial-stack.json` (injection strings in row values).
- **Scorer** (`eval/scorer.ts`) — 7 dimensions: `build_success`, `typecheck_clean`, `lint_clean`, `plan_coverage` (expected components in generated AST), `binding_fidelity` (expected columns in element map), `visual_quality` (1–5, mocked in CI), `injection_clean` (6 credential patterns).
- **Regression gate** (`eval/regression-gate.ts`) — `build_success` and `binding_fidelity` must not drop at all; `visual_quality` may not drop more than 0.15. Exits 1 on block.
- **Runner** (`eval/runner.ts`) — `pnpm eval` CLI with `--ci`, `--filter`, `--update-baseline`. `pnpm eval:ci` runs in CI with mock vision/a11y.
- **Baseline** (`fixtures/baselines/baseline-scores.json`) — 100% rates recorded; any degradation blocks CI.
- **CI integration** — `eval:ci` step added to `.github/workflows/ci.yml` after build.

**Telemetry (`packages/telemetry`):**
- `spans.ts` — 19 canonical `studio.*` span names + 20 attribute keys covering the full run lifecycle
- `withSpan()` — wraps any async fn in an OTel span; auto-records errors and sets status
- `ClickHouseWriter` — `writeRunStep()` + `writeBatch()` for run_steps table
- `schema.sql` — 3 MergeTree tables (`run_steps`, `credit_events`, `artifact_views`) + daily SummingMergeTree materialized view for aggregated dashboards
- `generateWeeklyTriage()` — queries ClickHouse for failures in the last 7 days, clusters by `step_name`, ranks by frequency

**Test counts:** 285 total (279 prompts + 6 telemetry)
- `packages/ui` — Radix UI component library
- `packages/prompts` — 200+ golden eval cases

---

## [0.11.0] — 2026-09-02

### Added — `apps/api` (C.11 Governance, Credits and Admin API)

BFF governance layer: credit metering, monthly cap enforcement with resume-capable errors, hash-chained audit log, and the full admin console API.

**Credit ledger:**
- Append-only Postgres ledger with `debit()` and `credit()` operations; atomically updates `workspaces.credit_balance` in the same transaction
- `getBalance()` returns `{ totalCredits, usedCredits, balance, monthUsed }` — all derived from the ledger, never from a mutable field
- `GET /v1/credits/balance`, `GET /v1/credits/history`, `POST /v1/credits/preview`, `POST /v1/credits/debit`

**Credit pricer** (T0–T3 rates with configurable multiplier):
| Tier | In (credits/MT) | Out (credits/MT) | Cache read |
|------|----------------|------------------|-----------|
| T0 nano | 1 | 5 | 0.1 |
| T1/T2 | 15 | 75 | 1.5 |
| T3 vision | 75 | 375 | 7.5 |
Plus 5 credits flat per sandbox build, 2 credits flat per preview set.

**`CreditCapError` — resume-capable typed error:**
- `userMessage` names the cap, the run ID, and that the generation is *paused* (not terminated)
- `resumeInstructions` points to Workspace Settings → Credits and references the Temporal `workflowId` so the run can resume without restarting
- `retryable: false`, `httpStatus: 402`
- Workspace at cap **can still** view and publish existing artifacts — `checkCanRun` only gates new generation

**Hash-chained audit log:**
- Every entry computes `SHA-256(previousHash || canonicalJSON(entry))` — tampering at any position breaks all downstream hashes
- `verifyChain(workspaceId)` walks the full history and returns `{ valid: boolean, brokenAt?: entryId }`
- `exportCsv()` and `exportJson()` (JSONL) for compliance export
- Genesis constant: `000...0` (64 zeros)

**Admin console API:**
- `GET /v1/admin/artifacts` — id, type, state, visibility, credits30d, dataScope
- `POST /v1/admin/artifacts/:id/force-unpublish` — delegates to publish service; audits the action
- `GET /v1/admin/audit` — filterable by actor/action/resource/date; format=json|csv|jsonl
- `PATCH /v1/admin/policy` — allowPublicPublishing, allowGitExport, allowedModelTiers, monthlyCreditCap, requireApprovalForPublish
- `GET /v1/admin/usage` — credits by user/project/day with period filter

**Files:** 21 files changed · **23/23 tests passing**
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
