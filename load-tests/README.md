# Stackby Studio — Load Test Suite

k6-based load tests targeting the **Phase 4 PRD gate**: 10× beta peak load with published artifact serve p99 < 2,000ms.

## Prerequisites

```bash
# Install k6 (macOS)
brew install k6

# Or via official installer
# https://k6.io/docs/getting-started/installation/
```

All services must be running locally (or pass `--env` overrides for a staging environment):

| Service            | Default URL                  |
|--------------------|------------------------------|
| `apps/studio-web`  | `http://localhost:3000`      |
| `apps/api`         | `http://localhost:4000`      |
| `services/publish` | `http://localhost:3006`      |
| `services/orchestrator` | `http://localhost:3004` |

Start all services:
```bash
pnpm dev
```

## Scenarios

### 1. `serve-artifact.js` — PRD gate scenario
The critical path. Ramps to 5,000 VUs (10× beta peak of 500) and verifies the serve route stays under 2,000ms p99.

```bash
k6 run load-tests/scenarios/serve-artifact.js

# Against staging:
k6 run --env PUBLISH_URL=https://publish.staging.stackby.com \
       load-tests/scenarios/serve-artifact.js
```

Expected pass condition: `http_req_duration p(99) < 2000ms` and `http_req_failed rate < 1%`.

### 2. `api-projects.js` — API steady load
100 VUs for 5 minutes hitting project create + list. Validates DB query performance under realistic concurrency.

```bash
k6 run load-tests/scenarios/api-projects.js

# Against staging:
k6 run --env API_URL=https://api.staging.stackby.com \
       load-tests/scenarios/api-projects.js
```

Expected: `p(95) < 500ms`, `p(99) < 1,000ms`.

### 3. `publish-meta.js` — Viewer metadata burst
Simulates a shared link going viral: ramps to 500 req/s arrival rate. Validates Redis cache performance on the metadata endpoint.

```bash
k6 run load-tests/scenarios/publish-meta.js
```

Expected: `p(99) < 300ms` (cache-hit path).

### 4. `full-flow.js` — End-to-end smoke
Low concurrency (10 VUs), exercises the complete builder flow: health → create project → list projects → serve artifact. Run before and after deployments.

```bash
k6 run load-tests/scenarios/full-flow.js
```

Expected: no 5xx responses, create project `p(99) < 2,000ms`.

## Running the full suite

```bash
# Sequential (recommended for local):
for f in serve-artifact api-projects publish-meta full-flow; do
  echo "=== $f ===" && k6 run load-tests/scenarios/$f.js
done

# With JSON output for CI:
k6 run --out json=results/serve-artifact.json \
       load-tests/scenarios/serve-artifact.js
```

## Environment variables

| Variable           | Default                     | Description                  |
|--------------------|-----------------------------|------------------------------|
| `BASE_URL`         | `http://localhost:3000`     | Next.js studio-web           |
| `API_URL`          | `http://localhost:4000`     | Governance / credits API     |
| `PUBLISH_URL`      | `http://localhost:3006`     | Publish service              |
| `ORCHESTRATOR_URL` | `http://localhost:3004`     | Orchestrator service         |

## Interpreting results

k6 prints a summary after each run. Key metrics:

- **`http_req_duration`** — latency percentiles; `p(99)` is the PRD gate value
- **`http_req_failed`** — fraction of requests that returned a network error or 5xx (4xx are not counted as failures by k6 by default — check scenario comments for how each handles them)
- **`group_duration`** — per-`group()` timing in `full-flow.js`

A ✓ next to a threshold means it passed; ✗ means it failed the gate.

## Adding new scenarios

1. Create `load-tests/scenarios/<name>.js`
2. Import helpers from `../lib/helpers.js`
3. Export `options` (with `scenarios` + `thresholds`) and a `default function`
4. Add an entry to `k6.config.js`'s `SCENARIOS` array
