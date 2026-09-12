/**
 * serve-artifact.js — PRD gate scenario
 *
 * Tests GET /serve/:slug/ on services/publish (port 3006).
 *
 * PRD Phase 4 gate: published artifact p99 < 2,000ms at 10× beta peak.
 * Beta peak = 500 concurrent users → 10× = 5,000 VUs.
 *
 * Expected responses:
 *   200  — public/link artifact, correctly served
 *   401  — workspace/password artifact without session (expected, not an error)
 *   404  — slug not found (expected for random slugs)
 *   410  — artifact unpublished (expected)
 * Any 5xx is counted as a failure.
 */

import http from 'k6/http';
import { sleep, check } from 'k6';
import { PUBLISH_URL, randomSlug } from '../lib/helpers.js';

export const options = {
  scenarios: {
    ramp: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m',  target: 200  },  // warm-up
        { duration: '3m',  target: 500  },  // sustain beta peak
        { duration: '2m',  target: 2500 },  // 5× peak
        { duration: '3m',  target: 5000 },  // 10× peak — PRD gate
        { duration: '1m',  target: 0    },  // ramp down
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    // PRD gate: p99 of all serve requests < 2,000ms
    http_req_duration: ['p(99)<2000'],
    // Anything 5xx is a failure; 4xx is expected for random slugs
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const slug = `test-artifact-${randomSlug()}`;
  const res = http.get(`${PUBLISH_URL}/serve/${slug}/`, {
    tags: { scenario: 'serve_artifact' },
    // Don't follow redirects — measure the first response only
    redirects: 0,
  });

  const acceptable = [200, 401, 404, 410];
  check(res, {
    'status is not 5xx': (r) => r.status < 500,
    'status is acceptable': (r) => acceptable.includes(r.status),
    'content-type is text/html when 200': (r) =>
      r.status !== 200 || (r.headers['Content-Type'] || '').includes('text/html'),
  });

  sleep(0.5);
}
