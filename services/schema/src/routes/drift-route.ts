import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import type { SchemaCache } from '../lib/cache.js';
import type { GatewayClient } from '../gateway-client.js';
import { introspectStack, type SchemaGraph, type SchemaTable } from '../lib/introspect.js';
import { detectDrift } from '../lib/drift.js';
import { DataBindingSchema } from '@stackby/schema-types';

const DriftBodySchema = z.object({
  previousHash: z.string(),
  previousTables: z.array(z.unknown()),
  bindings: z.array(DataBindingSchema).default([]),
});

export function registerDriftRoute(
  app: FastifyInstance,
  cache: SchemaCache,
  gateway: GatewayClient,
): void {
  app.post<{ Params: { stackId: string }; Body: unknown }>(
    '/schema/:stackId/drift',
    async (request, reply) => {
      const { stackId } = request.params;
      const body = DriftBodySchema.parse(request.body);

      const cached = await cache.getSchema(stackId);
      const newGraph: SchemaGraph = cached
        ? (JSON.parse(cached.data) as SchemaGraph)
        : await introspectStack(gateway, stackId);

      const result = detectDrift(
        body.previousTables as SchemaTable[],
        newGraph.tables,
        body.bindings,
      );

      return reply.send(result);
    },
  );
}
