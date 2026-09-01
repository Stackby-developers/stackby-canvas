import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import type Redis from 'ioredis';
import { unpublishDeployment } from '../deployment/unpublish.js';

export function registerUnpublishRoute(app: FastifyInstance, pool: Pool, redis: Redis): void {
  app.post<{ Params: { id: string } }>('/publish/:id/unpublish', async (request, reply) => {
    await unpublishDeployment(request.params.id, 'system', pool, redis);
    return reply.send({ unpublished: true });
  });
}
