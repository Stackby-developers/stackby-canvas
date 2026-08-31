import type { FastifyInstance } from 'fastify';
import type { SchemaCache } from '../lib/cache.js';
import type { GatewayClient } from '../gateway-client.js';
import { introspectStack, type SchemaGraph } from '../lib/introspect.js';
import { generateTypes } from '../lib/type-gen.js';

export function registerTypesRoute(
  app: FastifyInstance,
  cache: SchemaCache,
  gateway: GatewayClient,
): void {
  app.post<{ Params: { stackId: string } }>(
    '/schema/:stackId/types',
    async (request, reply) => {
      const { stackId } = request.params;

      const cached = await cache.getSchema(stackId);
      const graph: SchemaGraph = cached
        ? (JSON.parse(cached.data) as SchemaGraph)
        : await introspectStack(gateway, stackId);

      const typescript = generateTypes(graph.tables);
      return reply.send({ typescript });
    },
  );
}
