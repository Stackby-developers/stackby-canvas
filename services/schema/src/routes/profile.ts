import type { FastifyInstance } from 'fastify';
import type { SchemaCache } from '../lib/cache.js';
import type { GatewayClient } from '../gateway-client.js';
import type { Config } from '../config.js';
import { introspectStack, type SchemaGraph } from '../lib/introspect.js';
import { computeSemanticProfile } from '../lib/semantics.js';
import { sampleTables } from '../lib/sampler.js';

export function registerProfileRoute(
  app: FastifyInstance,
  cache: SchemaCache,
  gateway: GatewayClient,
  config: Config,
): void {
  app.get<{ Params: { stackId: string } }>(
    '/schema/:stackId/profile',
    async (request, reply) => {
      const { stackId } = request.params;

      const cached = await cache.getSchema(stackId);
      const graph: SchemaGraph = cached
        ? (JSON.parse(cached.data) as SchemaGraph)
        : await introspectStack(gateway, stackId);

      const [profile, samples] = await Promise.all([
        Promise.resolve(computeSemanticProfile(stackId, graph.tables)),
        sampleTables(gateway, stackId, graph.tables, config.SAMPLE_ROW_LIMIT),
      ]);

      return reply.send({ profile, samples });
    },
  );
}
