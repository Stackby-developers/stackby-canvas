import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';

const Q = z.object({ workspaceId: z.string(), limit: z.coerce.number().int().default(50), offset: z.coerce.number().int().default(0) });

export function registerAdminArtifactsRoute(app: FastifyInstance, pool: Pool): void {
  app.get<{ Querystring: unknown }>('/v1/admin/artifacts', async (request, reply) => {
    const { workspaceId, limit, offset } = Q.parse(request.query);
    const { rows } = await pool.query(
      `SELECT a.id, a.type, a.status, av.is_public,
         COALESCE(SUM(CASE WHEN cl.created_at >= NOW() - INTERVAL '30 days' THEN ABS(cl.amount) ELSE 0 END), 0) AS credits_30d
       FROM artifacts a
       LEFT JOIN artifact_versions av ON av.id = a.current_version_id
       LEFT JOIN credit_ledger cl ON cl.run_id = a.run_id
       WHERE a.workspace_id = $1
       GROUP BY a.id, av.id ORDER BY a.created_at DESC LIMIT $2 OFFSET $3`,
      [workspaceId, limit, offset],
    );
    return reply.send({
      artifacts: rows.map((r) => ({
        id: r['id'] as string,
        type: r['type'] as string,
        state: r['status'] as string,
        visibility: r['is_public'] ? 'public' : 'stack_collaborators',
        viewers30d: 0,
        credits30d: Number(r['credits_30d'] ?? 0),
        dataScope: { stacks: [], tables: [], columns: [] },
      })),
      limit, offset,
    });
  });
}
