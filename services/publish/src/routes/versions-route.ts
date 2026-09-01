import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { DeploymentStore } from '../deployment/store.js';

export function registerVersionsRoute(app: FastifyInstance, pool: Pool): void {
  app.get<{ Params: { id: string } }>(
    '/publish/:id/versions',
    async (request, reply) => {
      const store = new DeploymentStore(pool);
      const versions = await store.listVersions(request.params.id);
      return reply.send({ versions });
    },
  );
}
