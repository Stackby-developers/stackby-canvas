import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { DesignSystemStore } from '../store/design-system.js';

export function registerListRoute(app: FastifyInstance, pool: Pool): void {
  app.get<{ Querystring: { workspaceId: string } }>(
    '/design-systems',
    async (request, reply) => {
      const store = new DesignSystemStore(pool);
      const systems = await store.listByWorkspace(request.query.workspaceId);
      return reply.send({ designSystems: systems });
    },
  );

  app.get<{ Params: { id: string } }>('/design-systems/:id', async (request, reply) => {
    const store = new DesignSystemStore(pool);
    const ds = await store.getById(request.params.id);
    if (!ds) return reply.status(404).send({ error: 'Not found' });
    return reply.send(ds);
  });
}
