import type { FastifyInstance } from 'fastify';
import type { Redis } from 'ioredis';

export function registerExtractRoute(app: FastifyInstance, redis: Redis): void {
  app.post<{ Params: { id: string } }>('/design-systems/:id/extract', async (request, reply) => {
    // In production: start crawlSite in a background task, emit progress to Redis Stream
    // See src/extractor/page-crawler.ts for implementation notes
    return reply.status(202).send({ jobId: `job_${request.params.id}`, status: 'queued' });
  });
}
