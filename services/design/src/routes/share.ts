import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { SharingStore } from '../store/sharing.js';

const ShareBodySchema = z.object({
  grantedToUserId: z.string().optional().transform((v) => v ?? undefined),
  grantedToWorkspaceId: z.string().optional().transform((v) => v ?? undefined),
  role: z.enum(['view', 'edit']).default('view'),
  grantedByUserId: z.string().default('system'),
});

export function registerShareRoutes(app: FastifyInstance, pool: Pool): void {
  app.post<{ Params: { id: string }; Body: unknown }>('/design-systems/:id/shares', async (request, reply) => {
    const body = ShareBodySchema.parse(request.body);
    const store = new SharingStore(pool);
    const share = await store.grant({
      designSystemId: request.params.id,
      grantedByUserId: body.grantedByUserId,
      grantedToUserId: body.grantedToUserId,
      grantedToWorkspaceId: body.grantedToWorkspaceId,
      role: body.role,
    });
    return reply.status(201).send(share);
  });

  app.delete<{ Params: { id: string; userId: string } }>(
    '/design-systems/:id/shares/:userId',
    async (request, reply) => {
      const store = new SharingStore(pool);
      await store.revoke(request.params.id, request.params.userId);
      return reply.send({ revoked: true });
    },
  );
}
