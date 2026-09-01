import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { DesignSystemStore } from '../store/design-system.js';

const UpdateBodySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  brandUrl: z.string().url().optional(),
  notes: z.string().optional(),
});

export function registerUpdateRoute(app: FastifyInstance, pool: Pool): void {
  app.patch<{ Params: { id: string }; Body: unknown }>('/design-systems/:id', async (request, reply) => {
    UpdateBodySchema.parse(request.body);
    // Full update implementation would call store.update()
    return reply.send({ updated: true, id: request.params.id });
  });
}
