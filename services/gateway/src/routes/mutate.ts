import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import type { Redis } from 'ioredis';
import type { JwtVerifier } from '../auth/jwt.js';
import type { BindingRegistry } from '../bindings/registry.js';
import type { StackbyClient } from '../stackby-client.js';
import { resolvePermissions } from '../permissions/resolve.js';
import { READ_ONLY_COLUMN_TYPES } from '@stackby/schema-types';

const MutateBodySchema = z.object({
  bindingId: z.string(),
  stackId: z.string(),
  tableId: z.string(),
  op: z.enum(['create', 'update', 'delete']),
  records: z
    .array(
      z.object({
        id: z.string().optional(),
        fields: z.record(z.unknown()).optional(),
      }),
    )
    .min(1)
    .max(1000),
  // Optional: column type map for read-only enforcement at the gateway level
  columnTypes: z.record(z.string()).optional(),
});

export function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export interface MutateDeps {
  verifier: JwtVerifier;
  registry: BindingRegistry;
  client: StackbyClient;
  redis: Redis;
}

export function registerMutateRoute(app: FastifyInstance, deps: MutateDeps): void {
  app.post('/dg/v1/mutate', async (request, reply) => {
    // Idempotency-Key required — prevents double-writes on retries
    const idempotencyKey = request.headers['idempotency-key'];
    if (!idempotencyKey || typeof idempotencyKey !== 'string') {
      return reply.status(400).send({
        code: 'IDEMPOTENCY_KEY_REQUIRED',
        userMessage: 'Idempotency-Key header is required for write operations.',
      });
    }

    // Idempotency replay: return cached result for duplicate requests
    const idemKey = `idem:${idempotencyKey}`;
    const replay = await deps.redis.get(idemKey);
    if (replay) {
      return reply.send(JSON.parse(replay) as unknown);
    }

    // Authenticate
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

    let body;
    try {
      body = MutateBodySchema.parse(request.body);
    } catch (err) {
      return reply.status(400).send({ code: 'INVALID_BODY', message: String(err) });
    }

    // Resolve permissions
    try {
      await resolvePermissions(caller, body.stackId);
    } catch (err) {
      const e = err as { statusCode?: number; code?: string; message: string };
      return reply.status(e.statusCode ?? 403).send({ code: e.code ?? 'FORBIDDEN', message: e.message });
    }

    // Validate binding
    const artifactId = caller.kind === 'artifact' ? caller.claims.artifactId : null;
    const allColumns = [...new Set(body.records.flatMap((r) => Object.keys(r.fields ?? {})))];
    try {
      await deps.registry.validate(artifactId, body.tableId, allColumns);
    } catch (err) {
      const e = err as { statusCode?: number; code?: string; message: string };
      return reply.status(e.statusCode ?? 403).send({ code: e.code ?? 'FORBIDDEN', message: e.message });
    }

    // Reject writes to read-only columns when column type information is provided
    if (body.columnTypes) {
      for (const col of allColumns) {
        const colType = body.columnTypes[col];
        if (colType && READ_ONLY_COLUMN_TYPES.has(colType as never)) {
          return reply.status(400).send({
            code: 'READ_ONLY_COLUMN',
            message: `Column "${col}" is of type "${colType}" and cannot be written via the API.`,
            userMessage: `The column "${col}" is computed automatically and cannot be edited.`,
          });
        }
      }
    }

    // Chunk to ≤10 records per upstream call (Stackby API limit)
    const chunks = chunkArray(body.records, 10);
    const results: Array<{ id?: string; error?: string }> = [];

    for (const chunk of chunks) {
      try {
        if (body.op === 'create') {
          const res = await deps.client.createRows(
            body.stackId,
            body.tableId,
            chunk.map((r) => r.fields ?? {}),
          );
          results.push(...res);
        } else if (body.op === 'update') {
          const res = await deps.client.updateRows(
            body.stackId,
            body.tableId,
            chunk.map((r) => ({ id: r.id!, fields: r.fields ?? {} })),
          );
          results.push(...res);
        } else {
          const res = await deps.client.deleteRows(
            body.stackId,
            body.tableId,
            chunk.map((r) => r.id!),
          );
          results.push(...res);
        }
      } catch (err) {
        // Per-chunk error — push error entries for each record in the chunk, continue
        results.push(
          ...chunk.map(() => ({
            error: err instanceof Error ? err.message : 'Unknown error',
          })),
        );
      }
    }

    const response = { results, count: results.length };
    // Cache idempotency result for 24h
    await deps.redis.set(idemKey, JSON.stringify(response), 'EX', 86400);

    return reply.send(response);
  });
}
