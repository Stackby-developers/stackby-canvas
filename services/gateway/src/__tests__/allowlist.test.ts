/**
 * Stack allowlist enforcement tests.
 *
 * Verifies that the gateway rejects reads for stacks not in the workspace
 * allowlist (ws:policy:{workspaceId} Redis key), and passes when the allowlist
 * is empty or the stack is listed.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { JwtVerifier } from '../auth/jwt.js';
import { BindingRegistry } from '../bindings/registry.js';
import { RowCache } from '../cache/store.js';
import { PerStackTokenBucket } from '../rate-limit/token-bucket.js';
import { CooldownManager } from '../rate-limit/backoff.js';
import { registerReadRoute } from '../routes/read.js';
import { createMockRedis } from './mock-redis.js';

const JWT_SECRET = 'test-jwt-secret-that-is-at-least-32-chars-long';

function buildApp(redis: ReturnType<typeof createMockRedis>) {
  const app = Fastify({ logger: false });
  const verifier = new JwtVerifier(JWT_SECRET);
  const registry = new BindingRegistry(redis as never);
  const cache = new RowCache(redis as never, 60, 300);
  const bucket = new PerStackTokenBucket(redis as never, 4, 4);
  const cooldown = new CooldownManager(redis as never, 30_000);

  // Minimal StackbyClient mock — returns empty rows
  const client = {
    getRows: async () => ({ rows: [], truncated: false }),
  } as never;

  registerReadRoute(app, { verifier, registry, cache, bucket, cooldown, client, config: { ROW_CEILING: 5000 } as never });
  return { app, verifier };
}

async function makeToken(verifier: JwtVerifier, workspaceId: string) {
  return verifier.sign({ sub: 'user_1', workspaceId, role: 'editor', email: 'test@example.com' });
}

describe('Stack allowlist — gateway read route', () => {
  let redis: ReturnType<typeof createMockRedis>;

  beforeEach(() => {
    redis = createMockRedis();
  });

  it('blocks a stack not in the allowlist (403 STACK_NOT_ALLOWED)', async () => {
    const { app, verifier } = buildApp(redis);
    const workspaceId = 'ws_test';

    // Set allowlist to only allow 'allowed-stack'
    await redis.set(
      `ws:policy:${workspaceId}`,
      JSON.stringify({ allowedStackIds: ['allowed-stack'] }),
    );

    const token = await makeToken(verifier, workspaceId);

    const res = await app.inject({
      method: 'POST',
      url: '/dg/v1/read',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      payload: {
        stackId: 'blocked-stack',
        tableId: 'tbl_1',
        bindingId: 'bind_1',
        columns: [],
      },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ code: 'STACK_NOT_ALLOWED' });
  });

  it('allows a stack that is in the allowlist', async () => {
    const { app, verifier } = buildApp(redis);
    const workspaceId = 'ws_test2';

    await redis.set(
      `ws:policy:${workspaceId}`,
      JSON.stringify({ allowedStackIds: ['allowed-stack'] }),
    );

    // Register a binding so validation passes
    const registry = new BindingRegistry(redis as never);
    await registry.register('__studio__', []);

    const token = await makeToken(verifier, workspaceId);

    const res = await app.inject({
      method: 'POST',
      url: '/dg/v1/read',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      payload: {
        stackId: 'allowed-stack',
        tableId: 'tbl_1',
        bindingId: 'bind_1',
        columns: [],
      },
    });

    // Passes the allowlist gate (may fail later at resolvePermissions in test env — that's fine)
    expect(res.statusCode).not.toBe(403);
    const body = res.json() as { code?: string };
    if (body.code) {
      expect(body.code).not.toBe('STACK_NOT_ALLOWED');
    }
  });

  it('allows all stacks when allowlist is empty', async () => {
    const { app, verifier } = buildApp(redis);
    const workspaceId = 'ws_test3';

    // Empty allowedStackIds = no restriction
    await redis.set(
      `ws:policy:${workspaceId}`,
      JSON.stringify({ allowedStackIds: [] }),
    );

    const token = await makeToken(verifier, workspaceId);

    const res = await app.inject({
      method: 'POST',
      url: '/dg/v1/read',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      payload: {
        stackId: 'any-stack-id',
        tableId: 'tbl_1',
        bindingId: 'bind_1',
        columns: [],
      },
    });

    // Must not be a STACK_NOT_ALLOWED rejection
    expect(res.statusCode).not.toBe(403);
    const body = res.json() as { code?: string };
    if (body.code) {
      expect(body.code).not.toBe('STACK_NOT_ALLOWED');
    }
  });

  it('allows all stacks when no policy key is set in Redis', async () => {
    const { app, verifier } = buildApp(redis);
    const workspaceId = 'ws_no_policy';

    // No policy key in Redis at all
    const token = await makeToken(verifier, workspaceId);

    const res = await app.inject({
      method: 'POST',
      url: '/dg/v1/read',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      payload: {
        stackId: 'any-stack',
        tableId: 'tbl_1',
        bindingId: 'bind_1',
        columns: [],
      },
    });

    const body = res.json() as { code?: string };
    expect(res.statusCode).not.toBe(403);
    if (body.code) {
      expect(body.code).not.toBe('STACK_NOT_ALLOWED');
    }
  });
});
