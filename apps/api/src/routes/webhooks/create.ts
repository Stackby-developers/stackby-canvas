import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';

const SUPPORTED_EVENTS = [
  'artifact.published', 'artifact.unpublished',
  'run.started', 'run.completed', 'run.failed',
] as const;

const BodySchema = z.object({
  workspaceId: z.string().uuid(),
  url: z.string().url(),
  events: z.array(z.enum(SUPPORTED_EVENTS)).min(1),
  description: z.string().max(255).optional(),
  createdByUserId: z.string().uuid(),
});

export function registerWebhookCreateRoute(app: FastifyInstance, pool: Pool): void {
  app.post<{ Body: unknown }>('/v1/webhooks', async (request, reply) => {
    const body = BodySchema.parse(request.body);
    const secret = randomBytes(32).toString('hex');

    const { rows } = await pool.query(
      `INSERT INTO webhook_subscriptions (workspace_id, url, events, secret, description, created_by)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, url, events, description, created_at`,
      [body.workspaceId, body.url, body.events, secret, body.description ?? null, body.createdByUserId],
    );

    const row = rows[0]!;
    return reply.status(201).send({
      id: row['id'] as string,
      url: row['url'] as string,
      events: row['events'] as string[],
      description: row['description'] as string | null,
      createdAt: row['created_at'] as Date,
      // Secret returned only once — store it securely
      secret,
    });
  });
}
