import type { FastifyInstance } from 'fastify';
import type { Redis } from 'ioredis';

export function registerBuildLogRoute(app: FastifyInstance, redis: Redis): void {
  app.get<{ Params: { id: string } }>('/build/:id/log', async (request, reply) => {
    const log = await redis.lrange(`build:log:${request.params.id}`, 0, -1);
    return reply.send({ buildId: request.params.id, lines: log });
  });
}
