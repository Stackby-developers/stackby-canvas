import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';

interface ProjectRow {
  id: string;
  name: string;
  stack_id: string;
  status: string;
  created_at: Date;
  latest_run_status: string | null;
}

export function registerListProjectsRoute(app: FastifyInstance, pool: Pool): void {
  app.get<{ Querystring: { workspaceId: string } }>('/v1/projects', async (request, reply) => {
    const { workspaceId } = request.query;

    const result = await pool.query<ProjectRow>(
      `SELECT
         p.id,
         p.name,
         p.stack_id,
         p.status,
         p.created_at,
         r.status AS latest_run_status
       FROM projects p
       LEFT JOIN LATERAL (
         SELECT status FROM runs WHERE project_id = p.id ORDER BY started_at DESC LIMIT 1
       ) r ON true
       WHERE p.workspace_id = $1
       ORDER BY p.updated_at DESC
       LIMIT 50`,
      [workspaceId],
    );

    return reply.send({
      projects: result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        stackId: row.stack_id,
        status: row.status,
        createdAt: row.created_at,
        latestRunStatus: row.latest_run_status,
      })),
    });
  });
}
