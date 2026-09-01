import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import type Redis from 'ioredis';
import { resolveSlug } from '../routing/slug.js';
import { buildSecurityHeaders } from '../csp/builder.js';
import { loadingStateHtml } from '../runtime/loading-state.js';
import type { Config } from '../config.js';

export function registerServeRoute(
  app: FastifyInstance,
  pool: Pool,
  redis: Redis,
  config: Config,
): void {
  app.get<{ Params: { slug: string; '*': string } }>(
    '/serve/:slug/*',
    async (request, reply) => {
      const { slug } = request.params;
      const deployment = await resolveSlug(slug, pool, redis);

      if (!deployment) {
        return reply.status(404).send({ error: 'Deployment not found' });
      }
      if (deployment.unpublishedAt) {
        return reply.status(410).send({ error: 'This artifact has been unpublished' });
      }

      const headers = buildSecurityHeaders(config.GATEWAY_ORIGIN, deployment.permissions);
      for (const [key, value] of Object.entries(headers)) {
        reply.header(key, value);
      }

      const runtimeScriptUrl = `/runtime/${deployment.activeVersionId}/main.js`;
      return reply.type('text/html').send(loadingStateHtml(runtimeScriptUrl, 'pending'));
    },
  );
}
