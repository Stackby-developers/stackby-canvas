import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';

const PolicyBodySchema = z.object({
  workspaceId: z.string(),
  allowedRoles: z.array(z.string()).default(['owner', 'admin']),
  requireApproval: z.boolean().default(false),
});

export function registerPolicyRoute(app: FastifyInstance, pool: Pool): void {
  app.get<{ Params: { workspaceId: string } }>('/git/policy/:workspaceId', async (request, reply) => {
    const { rows } = await pool.query(
      `SELECT * FROM git_export_policies WHERE workspace_id=$1`,
      [request.params.workspaceId],
    );
    const row = rows[0];
    if (!row) return reply.send({ workspaceId: request.params.workspaceId, allowedRoles: ['owner', 'admin'], requireApproval: false });
    return reply.send({ workspaceId: row['workspace_id'], allowedRoles: row['allowed_roles'], requireApproval: row['require_approval'] });
  });

  app.post<{ Body: unknown }>('/git/policy', async (request, reply) => {
    const body = PolicyBodySchema.parse(request.body);
    await pool.query(
      `INSERT INTO git_export_policies (workspace_id, allowed_roles, require_approval)
       VALUES ($1,$2,$3)
       ON CONFLICT (workspace_id) DO UPDATE SET allowed_roles=$2, require_approval=$3`,
      [body.workspaceId, JSON.stringify(body.allowedRoles), body.requireApproval],
    );
    return reply.status(201).send(body);
  });
}
