import { describe, it, expect, beforeEach } from 'vitest';
import { vi } from 'vitest';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import type { GatewayClient } from '../gateway-client.js';
import type { SchemaCache } from '../lib/cache.js';
import type { Config } from '../config.js';
import { registerSchemaRoute } from '../routes/schema.js';
import { registerRefreshRoute } from '../routes/refresh.js';
import { registerProfileRoute } from '../routes/profile.js';
import { registerTypesRoute } from '../routes/types-route.js';
import { registerDriftRoute } from '../routes/drift-route.js';
import fullStack from '../__fixtures__/full-stack.json' with { type: 'json' };

const config: Config = {
  PORT: 3002,
  GATEWAY_URL: 'http://localhost:3003',
  REDIS_URL: 'redis://localhost:6379',
  SCHEMA_CACHE_TTL_SECONDS: 900,
  SAMPLE_ROW_LIMIT: 50,
  NODE_ENV: 'test',
};

function makeGateway(): GatewayClient {
  return {
    getStackSchema: vi.fn().mockResolvedValue(fullStack),
    getTableRows: vi.fn().mockResolvedValue({ rows: [] }),
  } as unknown as GatewayClient;
}

function makeCache(initial?: string): SchemaCache {
  let stored: { data: string; etag: string } | null = initial
    ? { data: initial, etag: 'test-etag' }
    : null;
  return {
    getSchema: vi.fn().mockImplementation(async () => stored),
    setSchema: vi.fn().mockImplementation(async (_id: string, data: string, etag: string) => {
      stored = { data, etag };
    }),
    invalidate: vi.fn().mockImplementation(async () => { stored = null; }),
    client: { ping: vi.fn().mockResolvedValue('PONG') },
  } as unknown as SchemaCache;
}

function buildApp(gateway: GatewayClient, cache: SchemaCache): FastifyInstance {
  const app = Fastify({ logger: false });
  registerSchemaRoute(app, cache, gateway, config);
  registerRefreshRoute(app, cache, gateway, config);
  registerProfileRoute(app, cache, gateway, config);
  registerTypesRoute(app, cache, gateway);
  registerDriftRoute(app, cache, gateway);
  return app;
}

describe('GET /schema/:stackId', () => {
  it('returns 200 with SchemaGraph when cache is empty', async () => {
    const app = buildApp(makeGateway(), makeCache());
    const res = await app.inject({ method: 'GET', url: '/schema/stk_test' });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { stackId: string; tables: unknown[]; hash: string };
    expect(body.stackId).toBe('stk_test');
    expect(body.tables).toHaveLength(3);
    expect(body.hash).toMatch(/^[0-9a-f]{16}$/);
    expect(res.headers['etag']).toBeDefined();
  });

  it('returns 304 when If-None-Match matches cached ETag', async () => {
    // Pre-populate cache with a known etag
    const graph = { stackId: 'stk_acme_pm', tables: [], hash: 'test-etag', stackName: 'Test', fetchedAt: new Date().toISOString() };
    const cache = makeCache(JSON.stringify(graph));
    const app = buildApp(makeGateway(), cache);

    const res = await app.inject({
      method: 'GET',
      url: '/schema/stk_test',
      headers: { 'if-none-match': 'test-etag' },
    });
    expect(res.statusCode).toBe(304);
  });

  it('returns cached schema with ETag header on cache hit', async () => {
    const graph = { stackId: 'stk_cached', tables: [], hash: 'test-etag', stackName: 'Cached', fetchedAt: new Date().toISOString() };
    const cache = makeCache(JSON.stringify(graph));
    const app = buildApp(makeGateway(), cache);

    const res = await app.inject({ method: 'GET', url: '/schema/stk_test' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['etag']).toBe('test-etag');
    const body = res.json() as { stackId: string };
    expect(body.stackId).toBe('stk_cached');
  });
});

describe('POST /schema/:stackId/refresh', () => {
  it('returns 200 with graph and diff', async () => {
    const app = buildApp(makeGateway(), makeCache());
    const res = await app.inject({ method: 'POST', url: '/schema/stk_test/refresh' });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { graph: unknown; diff: { changes: unknown[]; affectedBindings: unknown[] } };
    expect(body).toHaveProperty('graph');
    expect(body).toHaveProperty('diff');
    expect(body.diff.changes).toBeInstanceOf(Array);
  });

  it('invalidates the cache before re-introspecting', async () => {
    const cache = makeCache();
    const app = buildApp(makeGateway(), cache);
    await app.inject({ method: 'POST', url: '/schema/stk_test/refresh' });
    expect(cache.invalidate).toHaveBeenCalledWith('stk_test');
  });
});

describe('GET /schema/:stackId/profile', () => {
  it('returns profile and samples', async () => {
    const app = buildApp(makeGateway(), makeCache());
    const res = await app.inject({ method: 'GET', url: '/schema/stk_test/profile' });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { profile: { stackId: string }; samples: unknown[] };
    expect(body.profile.stackId).toBe('stk_test');
    expect(body.samples).toBeInstanceOf(Array);
  });
});

describe('POST /schema/:stackId/types', () => {
  it('returns TypeScript string containing export interface', async () => {
    const app = buildApp(makeGateway(), makeCache());
    const res = await app.inject({ method: 'POST', url: '/schema/stk_test/types' });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { typescript: string };
    expect(typeof body.typescript).toBe('string');
    expect(body.typescript).toContain('export interface');
  });
});

describe('POST /schema/:stackId/drift', () => {
  it('returns changes and affectedBindings', async () => {
    const app = buildApp(makeGateway(), makeCache());
    const body = {
      previousHash: 'abc123',
      previousTables: [],
      bindings: [],
    };
    const res = await app.inject({
      method: 'POST',
      url: '/schema/stk_test/drift',
      payload: body,
    });
    expect(res.statusCode).toBe(200);
    const result = res.json() as { changes: unknown[]; affectedBindings: unknown[] };
    expect(result).toHaveProperty('changes');
    expect(result).toHaveProperty('affectedBindings');
  });
});
