import { check } from 'k6';

// Service base URLs — override via --env flags
export const BASE_URL       = __ENV.BASE_URL        || 'http://localhost:3000';
export const API_URL        = __ENV.API_URL          || 'http://localhost:4000';
export const PUBLISH_URL    = __ENV.PUBLISH_URL      || 'http://localhost:3006';
export const ORCHESTRATOR_URL = __ENV.ORCHESTRATOR_URL || 'http://localhost:3004';

// Dev workspace/user UUIDs seeded by 0002_dev_seed.sql
export const DEV_WORKSPACE_ID = '00000000-0000-0000-0000-000000000001';
export const DEV_USER_ID      = '00000000-0000-0000-0000-000000000002';

/**
 * Generate a random 8-character hex string suitable for slug params.
 * k6 has no crypto module, so we use Math.random().
 */
export function randomSlug() {
  return Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
}

/**
 * Wrap k6 check() with a named tag and return the result.
 * @param {import('k6/http').RefinedResponse} res
 * @param {number[]} expected  Acceptable status codes
 * @param {string} tag         Label shown in k6 summary
 */
export function checkStatus(res, expected, tag) {
  return check(res, {
    [`${tag}: status in [${expected.join(',')}]`]: (r) => expected.includes(r.status),
  });
}

/** Standard JSON POST headers */
export const JSON_HEADERS = { 'Content-Type': 'application/json' };
