import type { FastifyInstance } from 'fastify';

// Map of jobId → AbortController for cancellation
const cancelMap = new Map<string, AbortController>();

export function registerCancelRoute(app: FastifyInstance): void {
  app.post<{ Params: { id: string } }>('/design-systems/:id/extract/cancel', async (request, reply) => {
    const jobId = `job_${request.params.id}`;
    const controller = cancelMap.get(jobId);
    if (controller) {
      controller.abort();
      cancelMap.delete(jobId);
    }
    return reply.send({ cancelled: true });
  });
}

export { cancelMap };
