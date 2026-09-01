import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import type Redis from 'ioredis';
import { rollbackDeployment } from '../deployment/rollback.js';

const RollbackBodySchema = z.object({ versionNumber: z.number().int().positive() });

export function registerRollbackRoute(app: FastifyInstance, pool: Pool, redis: Redis): void {
  app.post<{ Params: { id: string }; Body: unknown }>(
    '/publish/:id/rollback',
    async (request, reply) => {
      const { versionNumber } = RollbackBodySchema.parse(request.body);
      const result = await rollbackDeployment(request.params.id, versionNumber, 'system', pool, redis);
      return reply.send(result);
    },
  );
}
