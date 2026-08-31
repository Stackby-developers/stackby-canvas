import type { FastifyInstance } from 'fastify';
import type { SchemaCache } from '../lib/cache.js';
import type { GatewayClient } from '../gateway-client.js';
import type { Config } from '../config.js';
import { introspectStack } from '../lib/introspect.js';

export function registerSchemaRoute(
  app: FastifyInstance,
  cache: SchemaCache,
  gateway: GatewayClient,
  config: Config,
): void {
  app.get<{ Params: { stackId: string } }>(
    '/schema/:stackId',
    async (request, reply) => {
      const { stackId } = request.params;
      const ifNoneMatch = (request.headers as Record<string, string | undefined>)['if-none-match'];

      const cached = await cache.getSchema(stackId);
      if (cached) {
        if (ifNoneMatch && ifNoneMatch === cached.etag) {
          return reply.status(304).send();
        }
        return reply
          .header('ETag', cached.etag)
          .header('Cache-Control', 'private, max-age=900')
          .send(JSON.parse(cached.data) as unknown);
      }

      const graph = await introspectStack(gateway, stackId);
      const json = JSON.stringify(graph);
      await cache.setSchema(stackId, json, graph.hash, config.SCHEMA_CACHE_TTL_SECONDS);

      return reply
        .header('ETag', graph.hash)
        .header('Cache-Control', 'private, max-age=900')
        .send(graph);
    },
  );
}
