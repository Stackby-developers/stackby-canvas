import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';

const Q = z.object({
  workspaceId: z.string(),
  period: z.enum(['day', 'week', 'month', 'all']).default('month'),
  groupBy: z.enum(['user', 'project', 'day']).default('project'),
});

const INTERVALS: Record<string, string> = { day: '1 day', week: '7 days', month: '30 days', all: '3650 days' };

export function registerUsageRoute(app: FastifyInstance, pool: Pool): void {
  app.get<{ Querystring: unknown }>('/v1/admin/usage', async (request, reply) => {
    const { workspaceId, period, groupBy } = Q.parse(request.query);
    const interval = INTERVALS[period] ?? '30 days';
    let query: string;
    if (groupBy === 'day') {
      query = `SELECT DATE(created_at) as period, SUM(ABS(amount)) as credits FROM credit_ledger WHERE workspace_id=$1 AND amount < 0 AND created_at >= NOW() - INTERVAL '${interval}' GROUP BY DATE(created_at) ORDER BY period DESC`;
    } else {
      query = `SELECT run_id, SUM(ABS(amount)) as credits FROM credit_ledger WHERE workspace_id=$1 AND amount < 0 AND created_at >= NOW() - INTERVAL '${interval}' GROUP BY run_id ORDER BY credits DESC LIMIT 50`;
    }
    const { rows } = await pool.query(query, [workspaceId]);
    return reply.send({ usage: rows, workspaceId, period, groupBy });
  });
}
