import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { RepoLinkStore } from '../store/links.js';

export function registerLinksRoute(app: FastifyInstance, pool: Pool): void {
  app.get<{ Params: { projectId: string } }>('/git/links/project/:projectId', async (request, reply) => {
    const { rows } = await pool.query(
      `SELECT * FROM git_repo_links WHERE project_id=$1 ORDER BY created_at DESC LIMIT 1`,
      [request.params.projectId],
    );
    if (!rows[0]) return reply.status(404).send({ error: 'No link found' });
    const store = new RepoLinkStore(pool);
    const link = await store.getById(rows[0]['id'] as string);
    return reply.send(link);
  });
}
