import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { DesignSystemStore } from '../store/design-system.js';

const CreateBodySchema = z.object({
  workspaceId: z.string(),
  name: z.string().min(1).max(100),
  brandUrl: z.string().url().optional(),
  notes: z.string().optional(),
  createdByUserId: z.string().default('system'),
});

export function registerCreateRoute(app: FastifyInstance, pool: Pool): void {
  app.post('/design-systems', async (request, reply) => {
    const body = CreateBodySchema.parse(request.body);
    const store = new DesignSystemStore(pool);
    const ds = await store.create({
      workspaceId: body.workspaceId,
      name: body.name,
      brandUrl: body.brandUrl,
      notes: body.notes,
      createdByUserId: body.createdByUserId,
    });
    return reply.status(201).send(ds);
  });
}
