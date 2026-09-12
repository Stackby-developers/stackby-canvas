import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import type Redis from 'ioredis';
import { resolveSlug } from '../routing/slug.js';

export function registerMetaRoute(app: FastifyInstance, pool: Pool, redis: Redis): void {
  app.get<{ Params: { slug: string } }>('/publish/:slug/meta', async (request, reply) => {
    const { slug } = request.params;
    const deployment = await resolveSlug(slug, pool, redis);

    if (!deployment) {
      return reply.status(404).send({ error: 'Not found' });
    }
    if (deployment.unpublishedAt) {
      return reply.status(410).send({ error: 'Unpublished', unpublishedAt: deployment.unpublishedAt });
    }

    return reply.send({
      slug: deployment.slug,
      deploymentId: deployment.id,
      projectId: deployment.projectId,
      visibility: deployment.visibility,
      publishedAt: deployment.publishedAt,
    });
  });
}
