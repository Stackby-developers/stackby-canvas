import { z } from 'zod';
import type { FastifyInstance } from 'fastify';

const DeepLinkParamsSchema = z.object({
  table: z.string(),
  recordId: z.string(),
});

export function registerDeepLinkRoute(app: FastifyInstance): void {
  app.get<{ Params: { table: string; recordId: string } }>(
    '/r/:table/:recordId',
    async (request, reply) => {
      const { table, recordId } = DeepLinkParamsSchema.parse(request.params);
      const params = new URLSearchParams({ table, recordId });
      return reply.redirect(`/?${params}`, 302);
    },
  );
}
