import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import type Redis from 'ioredis';
import { unpublishDeployment } from '../deployment/unpublish.js';

const AdminBodySchema = z.object({
  deploymentId: z.string(),
  adminReason: z.string().optional(),
});

export function registerAdminRoute(app: FastifyInstance, pool: Pool, redis: Redis): void {
  app.post<{ Body: unknown }>('/admin/force-unpublish', async (request, reply) => {
    const { deploymentId } = AdminBodySchema.parse(request.body);
    await unpublishDeployment(deploymentId, 'admin', pool, redis);
    return reply.send({ forceUnpublished: true });
  });
}
