import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { DesignSystemStore } from '../store/design-system.js';

export function registerDependentsRoute(app: FastifyInstance, pool: Pool): void {
  app.get<{ Params: { id: string } }>('/design-systems/:id/dependents', async (request, reply) => {
    const store = new DesignSystemStore(pool);
    const dependents = await store.getDependentProjects(request.params.id);
    return reply.send({ dependents });
  });
}
