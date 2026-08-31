import { z } from 'zod';
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
import { fetchAllRows } from '../query/fetch.js';
import { computeAggregates } from '../aggregate/compute.js';

const AggBodySchema = z.object({
  bindingId: z.string(),
  stackId: z.string(),
  tableId: z.string(),
  groupBy: z.array(z.string()).optional(),
  metrics: z
    .array(
      z.object({
        fn: z.enum(['count', 'sum', 'avg', 'min', 'max', 'countDistinct', 'percentile']),
        column: z.string().optional(),
        percentile: z.number().min(0).max(100).optional(),
        alias: z.string().optional(),
      }),
    )
    .min(1),
  filter: z.record(z.unknown()).optional(),
});

export interface AggregateDeps {
  verifier: JwtVerifier;
  registry: BindingRegistry;
  cache: RowCache;
  bucket: PerStackTokenBucket;
  cooldown: CooldownManager;
  client: StackbyClient;
  config: Config;
}

export function registerAggregateRoute(app: FastifyInstance, deps: AggregateDeps): void {
  app.post('/dg/v1/aggregate', async (request, reply) => {
    const authHeader = request.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ code: 'UNAUTHORIZED' });
    }
    let caller;
    try {
      caller = await deps.verifier.verify(authHeader.slice(7));
    } catch {
      return reply.status(401).send({ code: 'UNAUTHORIZED' });
    }

    let body;
    try {
      body = AggBodySchema.parse(request.body);
    } catch (err) {
      return reply.status(400).send({ code: 'INVALID_BODY', message: String(err) });
    }

    let scope, scopeHash: string;
    try {
      ({ scope, scopeHash } = await resolvePermissions(caller, body.stackId));
    } catch (err) {
      const e = err as { statusCode?: number; code?: string; message: string };
      return reply.status(e.statusCode ?? 403).send({ code: e.code ?? 'FORBIDDEN', message: e.message });
    }

    const artifactId = caller.kind === 'artifact' ? caller.claims.artifactId : null;
    try {
      await deps.registry.validate(artifactId, body.tableId, []);
    } catch (err) {
      const e = err as { statusCode?: number; code?: string; message: string };
      return reply.status(e.statusCode ?? 403).send({ code: e.code ?? 'FORBIDDEN', message: e.message });
    }

    // Fetch (or hit cache) — aggregates are computed over the cached row set
    const cacheKey = buildCacheKey({
      stackId: body.stackId,
      tableId: body.tableId,
      columns: [],
      page: 1,
      permissionScopeHash: scopeHash,
    });

    const cached = await deps.cache.get(cacheKey);
    let rows: Array<{ id: string; createdTime: string; fields: Record<string, unknown> }>;

    if (cached) {
      rows = cached.value.rows;
    } else {
      const fetched = await fetchAllRows(
        deps.client,
        deps.bucket,
        deps.cooldown,
        body.stackId,
        { tableId: body.tableId, rowCeiling: deps.config.ROW_CEILING },
      );
      rows = fetched.rows;
      await deps.cache.set(cacheKey, {
        rows: fetched.rows,
        cachedAt: Date.now(),
        truncated: fetched.truncated,
        upstreamCalls: fetched.upstreamCalls,
      });
    }

    // Never ship raw rows to satisfy an aggregate
    const result = computeAggregates(rows, body.metrics, body.groupBy);
    return reply.send(result);
  });
}
