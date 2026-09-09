import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import type Redis from 'ioredis';
import { resolveSlug } from '../routing/slug.js';

const BodySchema = z.object({ password: z.string() });

export function registerCheckPasswordRoute(app: FastifyInstance, pool: Pool, redis: Redis): void {
  app.post<{ Params: { slug: string }; Body: unknown }>(
    '/publish/:slug/check-password',
    async (request, reply) => {
      const { slug } = request.params;
      const deployment = await resolveSlug(slug, pool, redis);

      if (!deployment || deployment.unpublishedAt) {
        return reply.status(404).send({ allowed: false });
      }
      if (deployment.visibility !== 'password') {
        return reply.send({ allowed: true });
      }

      const parsed = BodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ allowed: false });
      }

      const hash = createHash('sha256').update(parsed.data.password).digest('hex');
      return reply.send({ allowed: hash === deployment.passwordHash });
    },
  );
}
