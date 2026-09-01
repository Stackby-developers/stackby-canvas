import { z } from 'zod';
import { randomUUID } from 'crypto';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import type { Config } from '../../config.js';

const CreateProjectBodySchema = z.object({
  workspaceId: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1).max(255),
  stackId: z.string().min(1),
  artifactType: z.enum([
    'dashboard', 'portal', 'report', 'form', 'gallery',
    'website', 'document', 'presentation',
  ]),
  prompt: z.string().min(1).max(4000),
  designSystemId: z.string().uuid().optional(),
});

export function registerCreateProjectRoute(
  app: FastifyInstance,
  pool: Pool,
  config: Config,
): void {
  app.post<{ Body: unknown }>('/v1/projects', async (request, reply) => {
    const body = CreateProjectBodySchema.parse(request.body);

    const projectId = randomUUID();
    const runId = randomUUID();

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO projects (id, workspace_id, name, stack_id, design_system_id, status, created_by)
         VALUES ($1, $2, $3, $4, $5, 'draft', $6)`,
        [projectId, body.workspaceId, body.name, body.stackId, body.designSystemId ?? null, body.userId],
      );

      await client.query(
        `INSERT INTO runs (id, project_id, workspace_id, prompt, status)
         VALUES ($1, $2, $3, $4, 'pending')`,
        [runId, projectId, body.workspaceId, body.prompt],
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    try {
      const res = await fetch(`${config.ORCHESTRATOR_URL}/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          runId,
          stackId: body.stackId,
          prompt: body.prompt,
          artifactType: body.artifactType,
          designSystemId: body.designSystemId,
        }),
      });
      if (!res.ok) {
        app.log.error({ status: res.status }, 'Orchestrator /runs call failed');
      }
    } catch (err) {
      app.log.error({ err }, 'Failed to reach orchestrator — run remains pending');
    }

    return reply.status(201).send({ projectId, runId });
  });
}
