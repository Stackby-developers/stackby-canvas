import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { DesignSystemStore } from '../store/design-system.js';

export function registerVersionsRoute(app: FastifyInstance, pool: Pool): void {
  app.get<{ Params: { id: string } }>('/design-systems/:id/versions', async (request, reply) => {
    const store = new DesignSystemStore(pool);
    const versions = await store.listVersions(request.params.id);
    return reply.send({ versions });
  });
}
