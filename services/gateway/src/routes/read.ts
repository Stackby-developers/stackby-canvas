import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { JwtVerifier } from '../auth/jwt.js';
import type { BindingRegistry } from '../bindings/registry.js';
import type { RowCache } from '../cache/store.js';
import type { PerStackTokenBucket } from '../rate-limit/token-bucket.js';
import type { CooldownManager } from '../rate-limit/backoff.js';
import type { StackbyClient } from '../stackby-client.js';
import type { Config } from '../config.js';
import { resolvePermissions } from '../permissions/resolve.js';
import { buildCacheKey } from '../cache/key.js';
import { withCoalescingLock } from '../cache/coalesce.js';
import { fetchAllRows } from '../query/fetch.js';
import { shapeRows } from '../query/shape.js';
import { emitMetrics } from '../metrics.js';

const QuerySchema = z.object({
  stackId: z.string(),
  tableId: z.string(),
  bindingId: z.string(),
  viewId: z.string().optional(),
  columns: z.array(z.string()).default([]),
  filter: z.record(z.unknown()).optional(),
  sort: z
    .array(z.object({ columnId: z.string(), direction: z.enum(['asc', 'desc']) }))
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
});

export interface ReadRouteDeps {
  verifier: JwtVerifier;
  registry: BindingRegistry;
  cache: RowCache;
  bucket: PerStackTokenBucket;
  cooldown: CooldownManager;
  client: StackbyClient;
  config: Config;
}

export function registerReadRoute(app: FastifyInstance, deps: ReadRouteDeps): void {
  app.post('/dg/v1/read', async (request, reply) => {
    const start = Date.now();
    const requestId = randomUUID();

    // Step 1: Authenticate
    const authHeader = request.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ code: 'UNAUTHORIZED', message: 'Missing bearer token' });
    }
    let caller;
    try {
      caller = await deps.verifier.verify(authHeader.slice(7));
    } catch {
      return reply.status(401).send({ code: 'UNAUTHORIZED', message: 'Invalid token' });
    }

    // Step 2: Parse body
    let query;
    try {
      query = QuerySchema.parse(request.body);
    } catch (err) {
      return reply.status(400).send({ code: 'INVALID_BODY', message: String(err) });
    }

    // Step 3: Resolve permissions
    let scope, scopeHash: string;
    try {
      ({ scope, scopeHash } = await resolvePermissions(caller, query.stackId));
    } catch (err) {
      const e = err as { statusCode?: number; code?: string; message: string };
      return reply.status(e.statusCode ?? 403).send({ code: e.code ?? 'FORBIDDEN', message: e.message });
    }

    // Step 4: Validate binding (BEFORE cache — undeclared bindings rejected even if cached)
    const artifactId = caller.kind === 'artifact' ? caller.claims.artifactId : null;
    try {
      await deps.registry.validate(artifactId, query.tableId, query.columns);
    } catch (err) {
      const e = err as { statusCode?: number; code?: string; message: string };
      return reply.status(e.statusCode ?? 403).send({ code: e.code ?? 'FORBIDDEN', message: e.message });
    }

    // Step 5: Cache lookup
    const cacheKey = buildCacheKey({
      stackId: query.stackId,
      tableId: query.tableId,
      ...(query.viewId !== undefined ? { viewId: query.viewId } : {}),
      ...(query.filter !== undefined ? { filter: query.filter } : {}),
      ...(query.sort !== undefined ? { sort: query.sort } : {}),
      page: query.page,
      columns: query.columns,
      permissionScopeHash: scopeHash,
    });

    const cached = await deps.cache.get(cacheKey);
    if (cached) {
      // Masking runs at serve time — cache stores unmasked rows
      const shaped = shapeRows(cached.value.rows, scope, query.sort);
      emitMetrics(request.log, {
        requestId, stackId: query.stackId, cacheHit: true,
        upstreamCalls: 0, rows: shaped.length, latencyMs: Date.now() - start,
        throttled: false, viewerId: scope.viewerId, operation: 'read',
      });
      return reply
        .header('ETag', cacheKey.slice(-16))
        .send({
          data: shaped,
          meta: {
            rowIds: shaped.map((r) => r.id),
            columnIds: shaped.length > 0 ? Object.keys(shaped[0]!.fields) : [],
            cacheAgeMs: cached.ageMs,
            truncated: cached.value.truncated,
            upstreamCalls: 0,
          },
        });
    }

    // Step 6: Coalescing lock + upstream fetch
    let upstreamCallCount = 0;

    const served = await withCoalescingLock(
      deps.bucket.redis,
      cacheKey,
      async () => {
        const fetched = await fetchAllRows(deps.client, deps.bucket, deps.cooldown, query.stackId, {
          tableId: query.tableId,
          ...(query.viewId !== undefined ? { viewId: query.viewId } : {}),
          ...(query.columns.length ? { fields: query.columns } : {}),
          rowCeiling: deps.config.ROW_CEILING,
        });
        upstreamCallCount = fetched.upstreamCalls;
        const entry = {
          rows: fetched.rows,
          cachedAt: Date.now(),
          truncated: fetched.truncated,
          upstreamCalls: fetched.upstreamCalls,
        };
        await deps.cache.set(cacheKey, entry);
        await deps.cache.promoteToStale(cacheKey, entry);
        return entry;
      },
      async () => {
        const hit = await deps.cache.get(cacheKey);
        return hit ? hit.value : null;
      },
    );

    // Step 7: 429 stale fallback — viewer MUST NOT see a rate-limit error
    if (!served) {
      const stale = await deps.cache.getStale(cacheKey);
      if (stale) {
        const shaped = shapeRows(stale.rows, scope, query.sort);
        emitMetrics(request.log, {
          requestId, stackId: query.stackId, cacheHit: false,
          upstreamCalls: 0, rows: shaped.length, latencyMs: Date.now() - start,
          throttled: true, viewerId: scope.viewerId, operation: 'read',
        });
        return reply.send({
          data: shaped,
          meta: {
            rowIds: shaped.map((r) => r.id),
            columnIds: [],
            cacheAgeMs: -1,
            truncated: stale.truncated,
            upstreamCalls: 0,
          },
        });
      }
      return reply.status(503).send({
        code: 'UPSTREAM_UNAVAILABLE',
        userMessage: 'Data is temporarily unavailable. Please try again in a moment.',
      });
    }

    // Step 8: Shape and respond
    const shaped = shapeRows(served.rows, scope, query.sort);
    const upstreamCalls = upstreamCallCount;

    emitMetrics(request.log, {
      requestId, stackId: query.stackId, cacheHit: false,
      upstreamCalls, rows: shaped.length, latencyMs: Date.now() - start,
      throttled: false, viewerId: scope.viewerId, operation: 'read',
    });

    return reply
      .header('ETag', cacheKey.slice(-16))
      .send({
        data: shaped,
        meta: {
          rowIds: shaped.map((r) => r.id),
          columnIds: shaped.length > 0 ? Object.keys(shaped[0]!.fields) : [],
          cacheAgeMs: 0,
          truncated: served.truncated,
          upstreamCalls,
        },
      });
  });
}
