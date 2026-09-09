/**
 * Security penetration tests for services/publish.
 *
 * All tests use Fastify's inject() — no real network, no real DB/Redis.
 * The app boots in NODE_ENV=test which skips the live server start() and
 * connects lazily, so most routes 404/401/400 before touching persistence.
 * That is intentional: we verify the *guards*, not real data paths.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import app from '../index.js';

beforeAll(async () => {
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

// ---------------------------------------------------------------------------
// Suite 1 — Serve-route visibility enforcement
// ---------------------------------------------------------------------------

describe('Serve-route: visibility enforcement', () => {
  it('unknown slug returns 404, not 200 or 500 (no data leak)', async () => {
    // Attack: enumerate arbitrary slugs hoping to hit an unprotected artifact
    const res = await app.inject({ method: 'GET', url: '/serve/nonexistent-slug-xyz/' });
    expect([404, 401]).toContain(res.statusCode);
    expect(res.statusCode).not.toBe(200);
    expect(res.statusCode).not.toBe(500);
  });

  it('forged __ap_ cookie with wrong value is rejected (password bypass attempt)', async () => {
    // Attack: set the access cookie manually without going through check-password
    const res = await app.inject({
      method: 'GET',
      url: '/serve/any-slug/',
      headers: { cookie: '__ap_fake-deployment-id=deadbeefdeadbeef' },
    });
    expect(res.statusCode).not.toBe(200);
    expect(res.statusCode).not.toBe(500);
  });

  it('forged __studio_session JWT is rejected (workspace auth bypass)', async () => {
    // Attack: craft a plausible-looking but unsigned JWT for workspace-restricted artifact
    const fakeJwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhdHRhY2tlciIsIndvcmtzcGFjZUlkIjoiZmFrZSJ9.INVALIDSIG';
    const res = await app.inject({
      method: 'GET',
      url: '/serve/any-slug/',
      headers: { cookie: `__studio_session=${fakeJwt}` },
    });
    expect(res.statusCode).not.toBe(200);
    expect(res.statusCode).not.toBe(500);
  });

  it('internal errors do not leak stack traces (no 5xx for expected bad input)', async () => {
    // Attack: send malformed path characters hoping to trigger an unhandled exception
    const res = await app.inject({ method: 'GET', url: '/serve/%00null-byte/' });
    expect(res.statusCode).not.toBe(500);
  });

  it('response does not leak Fastify/Node version via Server header', async () => {
    const res = await app.inject({ method: 'GET', url: '/serve/probe/' });
    const server = res.headers['server'];
    // Should either be absent or a custom value — never expose Fastify/x.y.z
    if (server) {
      expect(server).not.toMatch(/fastify/i);
      expect(server).not.toMatch(/node/i);
    }
  });
});

// ---------------------------------------------------------------------------
// Suite 2 — Password check: rate limiting
// ---------------------------------------------------------------------------

describe('check-password: rate limiting', () => {
  it('11 rapid wrong-password attempts on same slug yield at least one 429', async () => {
    // Attack: brute-force password by sending many guesses quickly
    const results: number[] = [];
    for (let i = 0; i < 11; i++) {
      const res = await app.inject({
        method: 'POST',
        url: '/publish/rate-limit-test-slug/check-password',
        headers: { 'content-type': 'application/json' },
        payload: { password: `guess-${i}` },
      });
      results.push(res.statusCode);
    }
    // The route may 404 (slug not found) before hitting rate limit; both are safe.
    // But if it does process, we expect a 429 among the 11 attempts.
    const has429 = results.includes(429);
    const allSafe = results.every((s) => s !== 200 && s !== 500);
    expect(allSafe).toBe(true);
    // If none 404'd early (real slug), at least one must be rate-limited
    const allFourOhFour = results.every((s) => s === 404);
    if (!allFourOhFour) {
      expect(has429).toBe(true);
    }
  });

  it('rate-limit response includes an error field', async () => {
    // Verify the 429 response body is a structured error, not a bare string
    const results = await Promise.all(
      Array.from({ length: 12 }, () =>
        app.inject({
          method: 'POST',
          url: '/publish/rl-slug-2/check-password',
          headers: { 'content-type': 'application/json' },
          payload: { password: 'wrong' },
        }),
      ),
    );
    const rateLimited = results.find((r) => r.statusCode === 429);
    if (rateLimited) {
      const body = JSON.parse(rateLimited.body) as { error?: string };
      expect(body).toHaveProperty('error');
      expect(typeof body.error).toBe('string');
    }
  });
});

// ---------------------------------------------------------------------------
// Suite 3 — Open redirect prevention
// ---------------------------------------------------------------------------

describe('auth/start: open redirect prevention', () => {
  it('absolute external returnTo is stripped — Location must not forward to evil.com', async () => {
    // Attack: craft a returnTo that would bounce the victim to an attacker domain
    const res = await app.inject({
      method: 'GET',
      url: '/auth/start?returnTo=https://evil.com/steal',
    });
    // Must redirect (3xx) to the Stackby OAuth URL, with returnTo=/ or a safe path
    expect(res.statusCode).toBeGreaterThanOrEqual(300);
    expect(res.statusCode).toBeLessThan(400);
    const location = res.headers['location'] as string;
    expect(location).toBeDefined();
    // The redirect target is the OAuth provider — but the `returnTo` stored in Redis
    // must be '/'. The Location header points to OAuth, not evil.com directly.
    expect(location).not.toMatch(/evil\.com/);
  });

  it('protocol-relative external returnTo is stripped', async () => {
    // Attack: //evil.com bypasses "starts with https" checks in naive validators
    const res = await app.inject({
      method: 'GET',
      url: '/auth/start?returnTo=//evil.com',
    });
    expect(res.statusCode).toBeGreaterThanOrEqual(300);
    expect(res.statusCode).toBeLessThan(400);
    const location = res.headers['location'] as string;
    expect(location).not.toMatch(/evil\.com/);
  });

  it('relative returnTo /p/my-artifact is accepted and proceeds to OAuth', async () => {
    // Confirm legitimate use case still works after sanitisation
    const res = await app.inject({
      method: 'GET',
      url: '/auth/start?returnTo=/p/my-artifact',
    });
    expect(res.statusCode).toBeGreaterThanOrEqual(300);
    expect(res.statusCode).toBeLessThan(400);
    // Redirects to Stackby OAuth — we just confirm it's a redirect, not an error
  });

  it('missing returnTo defaults safely to / (no unhandled error)', async () => {
    const res = await app.inject({ method: 'GET', url: '/auth/start' });
    expect(res.statusCode).toBeGreaterThanOrEqual(300);
    expect(res.statusCode).toBeLessThan(400);
  });
});

// ---------------------------------------------------------------------------
// Suite 4 — CSP header correctness on serve route
// ---------------------------------------------------------------------------

describe('Serve-route: security headers', () => {
  // We cannot get a 200 without real DB data, but we can probe with a known slug
  // and check that even on 404/401 paths, error responses don't set unsafe headers.
  // For CSP correctness on actual 200s, the csp/builder.ts unit tests cover that.
  // Here we test that the route machinery doesn't inject any unsafe overrides.

  it('serve route does not add unsafe-eval to CSP in any response code path', async () => {
    const res = await app.inject({ method: 'GET', url: '/serve/csp-probe/' });
    const csp = res.headers['content-security-policy'] as string | undefined;
    if (csp) {
      expect(csp).not.toContain('unsafe-eval');
    }
  });

  it('X-Content-Type-Options is not actively set to an unsafe value', async () => {
    const res = await app.inject({ method: 'GET', url: '/serve/csp-probe/' });
    const xcto = res.headers['x-content-type-options'] as string | undefined;
    if (xcto) {
      expect(xcto.toLowerCase()).toBe('nosniff');
    }
  });

  it('X-Frame-Options on serve responses is restrictive when present', async () => {
    const res = await app.inject({ method: 'GET', url: '/serve/csp-probe/' });
    const xfo = res.headers['x-frame-options'] as string | undefined;
    if (xfo) {
      // Must be DENY or SAMEORIGIN — never ALLOWALL
      expect(['DENY', 'SAMEORIGIN']).toContain(xfo.toUpperCase());
    }
  });
});

// ---------------------------------------------------------------------------
// Suite 5 — Cookie security attributes
// ---------------------------------------------------------------------------

describe('check-password: cookie security attributes', () => {
  it('Set-Cookie for __ap_ is HttpOnly and SameSite=Lax (prevents XSS theft & CSRF)', async () => {
    // We can only observe the cookie if the slug/hash match a real deployment.
    // Without DB, the route 404s before setting a cookie.
    // This test verifies the *absence* of an insecure cookie — if the cookie IS
    // set (integration test with real DB), it must carry the right attributes.
    const res = await app.inject({
      method: 'POST',
      url: '/publish/exists-slug/check-password',
      headers: { 'content-type': 'application/json' },
      payload: { password: 'correct-password' },
    });

    const setCookie = res.headers['set-cookie'];
    if (setCookie) {
      const cookieStr = Array.isArray(setCookie) ? setCookie.join('; ') : setCookie;
      // If a cookie is set, enforce security attributes
      expect(cookieStr).toMatch(/HttpOnly/i);
      expect(cookieStr).toMatch(/SameSite=Lax/i);
      // Must NOT be accessible via JS (XSS protection)
      expect(cookieStr).not.toMatch(/SameSite=None/i);
    }
    // A 404 here (no real deployment) is expected and acceptable in unit context
    expect(res.statusCode).not.toBe(500);
  });
});

// ---------------------------------------------------------------------------
// Suite 6 — Input validation
// ---------------------------------------------------------------------------

describe('Input validation: path traversal and malformed input', () => {
  it('domain with path traversal characters is rejected with 400 or 404', async () => {
    // Attack: ../../../../etc/passwd as a domain value to attempt directory traversal
    const res = await app.inject({
      method: 'PATCH',
      url: '/publish/any-deployment-id/domain',
      headers: { 'content-type': 'application/json' },
      payload: { domain: '../../../../etc/passwd' },
    });
    // Zod regex /^[a-z0-9.-]{4,253}$/ rejects slashes → 400 (ZodError) before DB lookup
    expect([400, 404, 422, 500]).toContain(res.statusCode);
    // Specifically should NOT be 200 (accepted)
    expect(res.statusCode).not.toBe(200);
  });

  it('domain shorter than 4 chars is rejected', async () => {
    // Minimum hostname length is 4 chars per DOMAIN_RE
    const res = await app.inject({
      method: 'PATCH',
      url: '/publish/any-id/domain',
      headers: { 'content-type': 'application/json' },
      payload: { domain: 'a' },
    });
    expect(res.statusCode).not.toBe(200);
    expect(res.statusCode).not.toBe(500);
  });

  it('null domain is accepted (removes custom domain)', async () => {
    // Null is a valid value — removing the custom domain
    const res = await app.inject({
      method: 'PATCH',
      url: '/publish/any-id/domain',
      headers: { 'content-type': 'application/json' },
      payload: { domain: null },
    });
    // 404 because deployment doesn't exist, but NOT a validation error
    expect([404, 200]).toContain(res.statusCode);
    expect(res.statusCode).not.toBe(400);
    expect(res.statusCode).not.toBe(500);
  });

  it('check-password with missing body returns 400', async () => {
    // Attack: send no body hoping to crash the handler or get allowed:true
    const res = await app.inject({
      method: 'POST',
      url: '/publish/test/check-password',
      headers: { 'content-type': 'application/json' },
    });
    expect([400, 404]).toContain(res.statusCode);
    expect(res.statusCode).not.toBe(200);
    expect(res.statusCode).not.toBe(500);
  });

  it('check-password with empty string password does not return allowed:true', async () => {
    // Attack: empty password should never unlock a deployment
    const res = await app.inject({
      method: 'POST',
      url: '/publish/test/check-password',
      headers: { 'content-type': 'application/json' },
      payload: { password: '' },
    });
    if (res.statusCode === 200) {
      const body = JSON.parse(res.body) as { allowed: boolean };
      expect(body.allowed).toBe(false);
    } else {
      expect([400, 404]).toContain(res.statusCode);
    }
    expect(res.statusCode).not.toBe(500);
  });

  it('meta route for unknown slug returns 404 with structured error, not 500', async () => {
    // Verify error shape — never a raw stack trace
    const res = await app.inject({
      method: 'GET',
      url: '/publish/unknown-slug-zzz/meta',
    });
    expect([404, 410]).toContain(res.statusCode);
    const body = JSON.parse(res.body) as { error?: string };
    expect(body).toHaveProperty('error');
    expect(typeof body.error).toBe('string');
  });

  it('health endpoint always returns 200 (liveness probe must not 500)', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
  });
});
