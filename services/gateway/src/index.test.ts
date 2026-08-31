import { describe, it, expect, afterAll } from 'vitest';
import app from './index.js';

describe('gateway service routes', () => {
  afterAll(async () => { await app.close(); });

  it('GET /health returns ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: 'ok' });
  });

  it('GET /ready returns ready', async () => {
    const res = await app.inject({ method: 'GET', url: '/ready' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: 'ready' });
  });
});
