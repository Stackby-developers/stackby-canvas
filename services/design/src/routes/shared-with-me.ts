import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { SharingStore } from '../store/sharing.js';

export function registerSharedWithMeRoute(app: FastifyInstance, pool: Pool): void {
  app.get<{ Querystring: { userId: string; workspaceId: string } }>(
    '/design-systems/shared-with-me',
    async (request, reply) => {
      const { userId, workspaceId } = z.object({
        userId: z.string(),
        workspaceId: z.string(),
      }).parse(request.query);
      const store = new SharingStore(pool);
      const shared = await store.getSharedWithUser(userId, workspaceId);
      return reply.send({ shared });
    },
  );
}
