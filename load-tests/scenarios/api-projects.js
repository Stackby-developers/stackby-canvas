/**
 * api-projects.js — apps/api project creation and listing under steady load.
 *
 * 100 VUs sustained for 5 minutes exercises the two highest-traffic API paths:
 *   POST /v1/projects — creates a project + fires orchestrator run
 *   GET  /v1/projects — lists workspace projects (LATERAL join on latest run status)
 *
 * Thresholds are intentionally tighter than serve-artifact because these endpoints
 * hit Postgres directly and should respond well inside 500ms at p95.
 */

import http from 'k6/http';
import { sleep, check } from 'k6';
import { API_URL, DEV_WORKSPACE_ID, JSON_HEADERS, randomSlug } from '../lib/helpers.js';

export const options = {
  scenarios: {
    steady: {
      executor: 'constant-vus',
      vus: 100,
      duration: '5m',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    // Per-endpoint granularity via tags
    'http_req_duration{endpoint:create_project}': ['p(99)<1000'],
    'http_req_duration{endpoint:list_projects}':  ['p(99)<300'],
  },
};

export default function () {
  // --- Create project ---
  const createBody = JSON.stringify({
    workspaceId: DEV_WORKSPACE_ID,
    stackId: `stk_loadtest_${randomSlug()}`,
    prompt: 'Load test: build a sales dashboard',
    artifactType: 'dashboard',
  });

  const createRes = http.post(`${API_URL}/v1/projects`, createBody, {
    headers: JSON_HEADERS,
    tags: { endpoint: 'create_project' },
  });

  check(createRes, {
    'create: status 201': (r) => r.status === 201,
    'create: has project id': (r) => {
      try { return Boolean(JSON.parse(r.body).id); } catch { return false; }
    },
  });

  // --- List projects ---
  const listRes = http.get(
    `${API_URL}/v1/projects?workspaceId=${DEV_WORKSPACE_ID}`,
    { tags: { endpoint: 'list_projects' } },
  );

  check(listRes, {
    'list: status 200': (r) => r.status === 200,
    'list: has projects array': (r) => {
      try { return Array.isArray(JSON.parse(r.body).projects); } catch { return false; }
    },
  });

  sleep(1);
}
