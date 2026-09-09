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

      // Rate-limit: max 10 attempts per IP per 15 minutes.
      const rateKey = `pwcheck_rate:${slug}:${request.ip}`;
      const attempts = await redis.incr(rateKey);
      if (attempts === 1) await redis.expire(rateKey, 900);
      if (attempts > 10) {
        return reply.status(429).send({ allowed: false, error: 'Too many attempts. Try again later.' });
      }

      const parsed = BodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ allowed: false });
      }

      const hash = createHash('sha256').update(parsed.data.password).digest('hex');
      const allowed = hash === deployment.passwordHash;

      if (allowed) {
        // Set an httpOnly cookie so serve-route can confirm password was verified.
        reply.setCookie(`__ap_${deployment.id}`, deployment.passwordHash!, {
          httpOnly: true,
          secure: process.env['NODE_ENV'] === 'production',
          sameSite: 'lax',
          maxAge: 3600,
          path: '/',
        });
        await redis.del(rateKey);
      }

      return reply.send({ allowed });
    },
  );
}
