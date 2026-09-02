import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { DesignSystemStore } from '../store/design-system.js';

const UpdateBodySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  tokens: z.record(z.unknown()).optional(),
});

export function registerUpdateRoute(app: FastifyInstance, pool: Pool): void {
  app.patch<{ Params: { id: string }; Body: unknown }>('/design-systems/:id', async (request, reply) => {
    const body = UpdateBodySchema.parse(request.body);
    const store = new DesignSystemStore(pool);
    if (body.tokens !== undefined) {
      await store.updateTokens(request.params.id, body.tokens as Parameters<typeof store.updateTokens>[1]);
    }
    const updated = await store.getById(request.params.id);
    return reply.send(updated ?? { updated: true, id: request.params.id });
  });
}
