import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';

const Q = z.object({ workspaceId: z.string().uuid() });

export function registerWebhookListRoute(app: FastifyInstance, pool: Pool): void {
  app.get<{ Querystring: unknown }>('/v1/webhooks', async (request, reply) => {
    const { workspaceId } = Q.parse(request.query);
    const { rows } = await pool.query(
      `SELECT id, url, events, description, active, created_at, last_fired_at, failure_count
       FROM webhook_subscriptions WHERE workspace_id=$1 ORDER BY created_at DESC`,
      [workspaceId],
    );
    return reply.send({
      webhooks: rows.map((r) => ({
        id: r['id'] as string,
        url: r['url'] as string,
        events: r['events'] as string[],
        description: r['description'] as string | null,
        active: r['active'] as boolean,
        createdAt: r['created_at'] as Date,
        lastFiredAt: r['last_fired_at'] as Date | null,
        failureCount: r['failure_count'] as number,
      })),
    });
  });
}
