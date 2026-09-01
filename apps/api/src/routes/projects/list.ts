import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';

interface ProjectRow {
  id: string;
  name: string;
  stack_id: string;
  status: string;
  created_at: Date;
  updated_at: Date;
  latest_run_status: string | null;
  artifact_type: string | null;
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
         p.updated_at,
         r.status AS latest_run_status,
         a.type   AS artifact_type
       FROM projects p
       LEFT JOIN LATERAL (
         SELECT status FROM runs WHERE project_id = p.id ORDER BY started_at DESC LIMIT 1
       ) r ON true
       LEFT JOIN LATERAL (
         SELECT type FROM artifacts WHERE project_id = p.id ORDER BY created_at DESC LIMIT 1
       ) a ON true
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
        updatedAt: row.updated_at,
        latestRunStatus: row.latest_run_status,
        artifactType: row.artifact_type,
      })),
    });
  });
}
