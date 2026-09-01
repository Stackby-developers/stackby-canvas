import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { request as httpRequest } from 'undici';
import type { Config } from '../../config.js';
import { AuditLog } from '../../audit/chain.js';
import { randomUUID } from 'node:crypto';

const B = z.object({ workspaceId: z.string(), adminId: z.string().default('admin'), reason: z.string().optional() });

export function registerForceUnpublishRoute(app: FastifyInstance, pool: Pool, config: Config): void {
  app.post<{ Params: { id: string }; Body: unknown }>('/v1/admin/artifacts/:id/force-unpublish', async (request, reply) => {
    const { id } = request.params;
    const body = B.parse(request.body);

    const { statusCode } = await httpRequest(`${config.PUBLISH_SERVICE_URL}/admin/force-unpublish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deploymentId: id }),
    });

    if (statusCode !== 200) return reply.status(502).send({ error: 'Publish service error' });

    await new AuditLog(pool).append({
      id: randomUUID(),
      workspaceId: body.workspaceId,
      actorId: body.adminId,
      action: 'admin.force_unpublish',
      resourceType: 'artifact',
      resourceId: id,
      metadata: { reason: body.reason ?? 'Admin action', propagationTargetMs: 60_000 },
      createdAt: new Date(),
    });

    return reply.send({ forceUnpublished: true, propagationMs: 60_000 });
  });
}
