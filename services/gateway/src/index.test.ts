// Basic health/ready smoke tests — full route tests live in src/__tests__/
import { describe, it, expect } from 'vitest';

// Set env before importing the app
process.env['STACKBY_PAT'] = 'test-pat-value';
process.env['JWT_SECRET'] = 'test-jwt-secret-that-is-at-least-32-chars-long';
process.env['NODE_ENV'] = 'test';
process.env['REDIS_URL'] = 'redis://localhost:6379'; // won't connect — lazyConnect

const { default: app } = await import('./index.js');

describe('gateway service — health routes', () => {
  it('GET /health returns ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: 'ok' });
  });

  // /ready calls redis.ping() which requires a real connection — skip in unit tests
  it('GET /ready endpoint exists', async () => {
    const res = await app.inject({ method: 'GET', url: '/ready' });
    // May fail if no Redis — just check it's not a 404
    expect(res.statusCode).not.toBe(404);
  });
});
