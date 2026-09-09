# SOC 2 Type II Controls Matrix — Stackby Studio

**Trust Service Criteria:** Security (CC), Availability (A), Confidentiality (C)
**Prepared:** 2026-09-10 · **Review cycle:** Quarterly

---

## CC1 — Control Environment

| Control | Description | Implementation | Status |
|---------|-------------|----------------|--------|
| CC1.1 | COSO principle: demonstrates commitment to integrity | Engineering standards enforced via TypeScript strict mode, ESLint, pre-commit hooks, and mandatory code review | ✅ Implemented |
| CC1.2 | Board oversight | Engineering lead reviews security posture quarterly; PRD gates all major feature work | ✅ Implemented |
| CC1.3 | Organisational structure | Role-based workspace membership (`owner`, `admin`, `editor`, `viewer`) enforced at API layer | ✅ Implemented |
| CC1.4 | Competence | Code quality enforced via turbo CI: typecheck → lint → test → build on every PR | ✅ Implemented |
| CC1.5 | Accountability | All audit log entries include `actorId`; chain-hashed for tamper evidence | ✅ Implemented |

---

## CC2 — Communication and Information

| Control | Description | Implementation | Status |
|---------|-------------|----------------|--------|
| CC2.1 | Information quality | Zod schema validation on all API inputs/outputs; `@stackby/schema-types` as single source of truth | ✅ Implemented |
| CC2.2 | Internal communication | CHANGELOG maintained per release; architecture docs in `docs/` | ✅ Implemented |
| CC2.3 | External communication | Public documentation site (`apps/docs`); security disclosure at `security@stackby.com` | ✅ Implemented |

---

## CC3 — Risk Assessment

| Control | Description | Implementation | Status |
|---------|-------------|----------------|--------|
| CC3.1 | Risk identification | Security pen test suite (`services/publish/src/__tests__/security.test.ts`) runs in CI | ✅ Implemented |
| CC3.2 | Risk analysis | Load tests (`load-tests/`) validate p99 < 2s at 10× beta peak | ✅ Implemented |
| CC3.3 | Risk mitigation | Visibility bypass fixed in serve-route; rate limiting on password check; open redirect closed | ✅ Implemented |

---

## CC6 — Logical and Physical Access Controls

| Control | Description | Implementation | Status |
|---------|-------------|----------------|--------|
| CC6.1 | Logical access security | JWT auth on all API routes; `__studio_session` httpOnly cookie; PKCE OAuth2 for viewer auth | ✅ Implemented |
| CC6.2 | New access registration | PAT-based auth; workspace membership via `workspace_members` table with RLS | ✅ Implemented |
| CC6.3 | Modify access | Workspace policy controls `allow_public_publishing`, `allow_git_export`, `allowed_model_tiers` | ✅ Implemented |
| CC6.4 | Remove access | Workspace member removal cascades via DB foreign key; PAT revocation invalidates sessions | ✅ Implemented |
| CC6.6 | Logical access security measures | Build sandbox (Firecracker microVM); secret scanner blocks credential commits; CSP `frame-ancestors 'none'` | ✅ Implemented |
| CC6.7 | Transmission encryption | TLS enforced in production (`secure: process.env.NODE_ENV === 'production'` on all cookies) | ✅ Implemented |
| CC6.8 | Malicious software | Build sandbox with no outbound network; secret scanner on git export; CSP blocks `unsafe-eval` | ✅ Implemented |

---

## CC7 — System Operations

| Control | Description | Implementation | Status |
|---------|-------------|----------------|--------|
| CC7.1 | Vulnerability management | Security pen test in CI; dependabot enabled; `npm audit` in CI pipeline | ✅ Implemented |
| CC7.2 | System monitoring | Fastify structured logging (JSON); OTel traces via `@stackby/telemetry` `withSpan()`; health/ready endpoints on all services | ✅ Implemented |
| CC7.3 | Anomaly detection | Rate limit events logged; failed auth attempts return structured errors; password check rate limit at 10/15min | ✅ Implemented |
| CC7.4 | Incident response | Escalation path: on-call → security@stackby.com; 72h SLA for critical issues | ⚠️ Process only |
| CC7.5 | Remediation | Security findings tracked in GitHub issues; fix SLA enforced by CI gate | ✅ Implemented |

---

## CC8 — Change Management

| Control | Description | Implementation | Status |
|---------|-------------|----------------|--------|
| CC8.1 | Change management | All changes via PRs with required review; CI must pass before merge; CHANGELOG on every release | ✅ Implemented |

---

## CC9 — Risk Mitigation

| Control | Description | Implementation | Status |
|---------|-------------|----------------|--------|
| CC9.1 | Risk mitigation — vendors | Data Gateway is the only path to Stackby; no third-party data processors in the artifact build pipeline | ✅ Implemented |
| CC9.2 | Data retention | `infra/db/migrations/0003_retention_policies.sql`; nightly `apps/api/src/jobs/retention.ts`; defaults: runs 90d, credit ledger 7y (anonymised), audit log 7y | ✅ Implemented |

---

## A1 — Availability

| Control | Description | Implementation | Status |
|---------|-------------|----------------|--------|
| A1.1 | Availability commitments | p99 < 2s for published artifact serve (CDN-cached with `s-maxage=3600`); health/ready endpoints for load-balancer probes | ✅ Implemented |
| A1.2 | Environmental protections | Postgres 16 with daily backups; Redis AOF persistence; docker-compose.dev.yml with healthchecks | ⚠️ Backup job not yet automated |
| A1.3 | Recovery objectives | Temporal workflow history enables run resumption after failure; immutable deployments allow instant rollback | ✅ Implemented |

---

## C1 — Confidentiality

| Control | Description | Implementation | Status |
|---------|-------------|----------------|--------|
| C1.1 | Identification of confidential information | Stackby PATs stored only in memory/session cookies; no PAT persistence in DB; column masking in Data Gateway | ✅ Implemented |
| C1.2 | Disposal of confidential information | Retention job anonymises credit ledger entries after 7 years; build sandbox files deleted after run | ✅ Implemented |

---

## Gaps and remediation plan

| Gap | Priority | Owner | Target |
|-----|----------|-------|--------|
| Automated DB backup job | High | Infrastructure | Q4 2026 |
| Formal penetration test by external vendor | High | Security | Q4 2026 |
| Incident response runbook documented | Medium | Engineering | Q4 2026 |
| SOC 2 Type II audit engagement | High | Legal/Compliance | Q1 2027 |
