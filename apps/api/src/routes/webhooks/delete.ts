import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';

const Q = z.object({ workspaceId: z.string().uuid() });

export function registerWebhookDeleteRoute(app: FastifyInstance, pool: Pool): void {
  app.delete<{ Params: { id: string }; Querystring: unknown }>(
    '/v1/webhooks/:id',
    async (request, reply) => {
      const { workspaceId } = Q.parse(request.query);
      const { rowCount } = await pool.query(
        `DELETE FROM webhook_subscriptions WHERE id=$1 AND workspace_id=$2`,
        [request.params.id, workspaceId],
      );
      if (!rowCount) return reply.status(404).send({ error: 'Webhook not found' });
      return reply.status(204).send();
    },
  );
}
