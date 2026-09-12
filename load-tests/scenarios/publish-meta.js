/**
 * publish-meta.js — viewer metadata endpoint under bursty arrival rate.
 *
 * GET /publish/:slug/meta is the first call every visitor makes when loading
 * /p/:slug. It is Redis-backed (60s TTL per slug) so should be very fast
 * under cache-hit conditions. The burst scenario validates that it stays
 * under 300ms p99 even at 500 req/s arrival rate.
 *
 * Uses ramping-arrival-rate to model real-world bursty traffic patterns
 * (e.g. a shared link going viral) rather than a fixed VU count.
 */

import http from 'k6/http';
import { check } from 'k6';
import { PUBLISH_URL, randomSlug } from '../lib/helpers.js';

export const options = {
  scenarios: {
    burst: {
      executor: 'ramping-arrival-rate',
      startRate: 100,
      timeUnit: '1s',
      stages: [
        { duration: '2m', target: 500 },  // ramp to 500 req/s
        { duration: '5m', target: 500 },  // hold at 500 req/s
      ],
      preAllocatedVUs: 200,
      maxVUs: 1000,
    },
  },
  thresholds: {
    // Redis-cached meta should be very fast
    http_req_duration: ['p(99)<300'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const slug = randomSlug();
  const res = http.get(`${PUBLISH_URL}/publish/${slug}/meta`, {
    tags: { scenario: 'publish_meta' },
  });

  check(res, {
    'status not 5xx': (r) => r.status < 500,
    'status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    'response is json': (r) =>
      (r.headers['Content-Type'] || '').includes('application/json'),
  });
  // No sleep — arrival rate executor manages pacing
}
