/**
 * k6.config.js — shared thresholds and scenario index.
 *
 * This file is NOT a runnable k6 script — it documents the suite structure
 * and shared thresholds that each scenario re-declares locally.
 *
 * To run the full suite sequentially:
 *   k6 run load-tests/scenarios/serve-artifact.js
 *   k6 run load-tests/scenarios/api-projects.js
 *   k6 run load-tests/scenarios/publish-meta.js
 *   k6 run load-tests/scenarios/full-flow.js
 *
 * k6 Cloud (parallel execution):
 *   k6 cloud --config load-tests/k6.config.js load-tests/scenarios/serve-artifact.js
 */

// Shared PRD-derived thresholds (copy into each scenario's options.thresholds)
export const PRD_THRESHOLDS = {
  // Phase 4 gate: published artifact serve p99 < 2,000ms
  'http_req_duration{scenario:serve_artifact}': ['p(99)<2000'],
  // API endpoints should respond within 1s p99
  http_req_duration: ['p(99)<1000'],
  // Overall error rate < 1%
  http_req_failed: ['rate<0.01'],
};

// Scenario registry (informational)
export const SCENARIOS = [
  {
    file: 'scenarios/serve-artifact.js',
    name: 'Serve artifact — 10× beta peak',
    prdGate: 'p99 < 2,000ms at 5,000 VU',
    duration: '~10m',
  },
  {
    file: 'scenarios/api-projects.js',
    name: 'API projects — steady 100 VU',
    prdGate: 'p95 < 500ms, p99 < 1,000ms',
    duration: '5m',
  },
  {
    file: 'scenarios/publish-meta.js',
    name: 'Publish meta — 500 req/s burst',
    prdGate: 'p99 < 300ms (Redis-cached)',
    duration: '~7m',
  },
  {
    file: 'scenarios/full-flow.js',
    name: 'Full flow smoke — 10 VU end-to-end',
    prdGate: 'No 5xx; create project p99 < 2,000ms',
    duration: '3m',
  },
];
