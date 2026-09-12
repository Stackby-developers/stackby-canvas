import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import type Redis from 'ioredis';
import { DeploymentStore } from '../deployment/store.js';

const DOMAIN_RE = /^[a-z0-9.-]{4,253}$/;

const BodySchema = z.object({
  domain: z.string().regex(DOMAIN_RE).nullable(),
});

export function registerCustomDomainRoute(
  app: FastifyInstance,
  pool: Pool,
  redis: Redis,
): void {
  app.patch<{ Params: { deploymentId: string }; Body: unknown }>(
    '/publish/:deploymentId/domain',
    async (request, reply) => {
      const { domain } = BodySchema.parse(request.body);
      const store = new DeploymentStore(pool);
      const deployment = await store.getById(request.params.deploymentId);

      if (!deployment) {
        return reply.status(404).send({ error: 'Deployment not found' });
      }

      // Invalidate old custom-domain cache entry if one existed
      if (deployment.customDomain) {
        await redis.del(`domain:${deployment.customDomain}`);
      }

      await store.setCustomDomain(deployment.id, domain);

      // Invalidate slug cache so next serve picks up updated deployment
      await redis.del(`slug:${deployment.slug}`);

      return reply.send({ deploymentId: deployment.id, customDomain: domain });
    },
  );
}
