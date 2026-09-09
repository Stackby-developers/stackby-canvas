/**
 * full-flow.js — end-to-end smoke test at low concurrency.
 *
 * Exercises the complete happy path a builder follows:
 *   1. Health checks (api + publish)
 *   2. Create a project
 *   3. List workspace projects
 *   4. Serve an artifact (simulates viewer)
 *
 * Intentionally low VU count (10) — this is a correctness smoke test,
 * not a stress test. Run it before and after deployments.
 *
 * Uses group() so k6's summary shows per-step durations, making it easy
 * to spot which step is slow after a regression.
 */

import http from 'k6/http';
import { sleep, check, group } from 'k6';
import {
  API_URL, PUBLISH_URL,
  DEV_WORKSPACE_ID, JSON_HEADERS, randomSlug,
} from '../lib/helpers.js';

export const options = {
  scenarios: {
    smoke: {
      executor: 'constant-vus',
      vus: 10,
      duration: '3m',
    },
  },
  thresholds: {
    // PRD gate applied to the create-project step specifically
    'group_duration{group:::create project}': ['p(99)<2000'],
    // Serve must meet the same p99 gate even in the smoke scenario
    'group_duration{group:::serve artifact}': ['p(99)<2000'],
    http_req_failed: ['rate<0.05'],
  },
};

export default function () {
  // 1. Health checks
  group('health checks', () => {
    const apiHealth = http.get(`${API_URL}/health`);
    check(apiHealth, { 'api healthy': (r) => r.status === 200 });

    const pubHealth = http.get(`${PUBLISH_URL}/health`);
    check(pubHealth, { 'publish healthy': (r) => r.status === 200 });
  });

  sleep(0.2);

  // 2. Create project
  let projectId;
  group('create project', () => {
    const res = http.post(
      `${API_URL}/v1/projects`,
      JSON.stringify({
        workspaceId: DEV_WORKSPACE_ID,
        stackId: `stk_smoke_${randomSlug()}`,
        prompt: 'Smoke test: sales pipeline dashboard',
        artifactType: 'dashboard',
      }),
      { headers: JSON_HEADERS },
    );

    const ok = check(res, {
      'create project 201': (r) => r.status === 201,
      'create project has id': (r) => {
        try { projectId = JSON.parse(r.body).id; return Boolean(projectId); } catch { return false; }
      },
    });
    if (!ok) { sleep(1); return; }
  });

  sleep(0.3);

  // 3. List projects
  group('list projects', () => {
    const res = http.get(`${API_URL}/v1/projects?workspaceId=${DEV_WORKSPACE_ID}`);
    check(res, {
      'list projects 200': (r) => r.status === 200,
      'list projects is array': (r) => {
        try { return Array.isArray(JSON.parse(r.body).projects); } catch { return false; }
      },
    });
  });

  sleep(0.3);

  // 4. Serve artifact (viewer simulation — expect 401 or 404 for random slugs)
  group('serve artifact', () => {
    const slug = `smoke-${randomSlug()}`;
    const res = http.get(`${PUBLISH_URL}/serve/${slug}/`, { redirects: 0 });
    check(res, {
      'serve not 5xx': (r) => r.status < 500,
    });
  });

  sleep(1);
}
