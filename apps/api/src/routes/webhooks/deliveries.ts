import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';

const Q = z.object({ workspaceId: z.string().uuid() });

export function registerWebhookDeliveriesRoute(app: FastifyInstance, pool: Pool): void {
  app.get<{ Params: { id: string }; Querystring: unknown }>(
    '/v1/webhooks/:id/deliveries',
    async (request, reply) => {
      const { workspaceId } = Q.parse(request.query);

      // Verify ownership before returning delivery details
      const { rowCount } = await pool.query(
        `SELECT 1 FROM webhook_subscriptions WHERE id=$1 AND workspace_id=$2`,
        [request.params.id, workspaceId],
      );
      if (!rowCount) return reply.status(404).send({ error: 'Webhook not found' });

      const { rows } = await pool.query(
        `SELECT id, event, response_status, duration_ms, attempt, delivered_at, success
         FROM webhook_deliveries WHERE subscription_id=$1
         ORDER BY delivered_at DESC LIMIT 50`,
        [request.params.id],
      );

      return reply.send({
        deliveries: rows.map((r) => ({
          id: r['id'] as string,
          event: r['event'] as string,
          responseStatus: r['response_status'] as number | null,
          durationMs: r['duration_ms'] as number | null,
          attempt: r['attempt'] as number,
          deliveredAt: r['delivered_at'] as Date,
          success: r['success'] as boolean,
        })),
      });
    },
  );
}
