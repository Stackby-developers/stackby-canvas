import type { FastifyInstance } from 'fastify';
import type { SchemaCache } from '../lib/cache.js';
import type { GatewayClient } from '../gateway-client.js';
import type { Config } from '../config.js';
import { introspectStack } from '../lib/introspect.js';
import { detectDrift } from '../lib/drift.js';
import type { SchemaTable } from '../lib/introspect.js';

export function registerRefreshRoute(
  app: FastifyInstance,
  cache: SchemaCache,
  gateway: GatewayClient,
  config: Config,
): void {
  app.post<{ Params: { stackId: string } }>(
    '/schema/:stackId/refresh',
    async (request, reply) => {
      const { stackId } = request.params;

      const cached = await cache.getSchema(stackId);
      const oldGraph = cached ? (JSON.parse(cached.data) as { tables: SchemaTable[] }) : null;

      await cache.invalidate(stackId);
      const newGraph = await introspectStack(gateway, stackId);
      const json = JSON.stringify(newGraph);
      await cache.setSchema(stackId, json, newGraph.hash, config.SCHEMA_CACHE_TTL_SECONDS);

      const diff = oldGraph
        ? detectDrift(oldGraph.tables, newGraph.tables, [])
        : { changes: [], affectedBindings: [] };

      return reply.send({ graph: newGraph, diff });
    },
  );
}
