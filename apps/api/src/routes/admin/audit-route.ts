import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { AuditLog } from '../../audit/chain.js';

const Q = z.object({
  workspaceId: z.string().optional(),
  actorId: z.string().optional(),
  action: z.string().optional(),
  resourceType: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  format: z.enum(['json', 'csv', 'jsonl']).default('json'),
  limit: z.coerce.number().int().default(100),
  offset: z.coerce.number().int().default(0),
});

export function registerAuditRoute(app: FastifyInstance, pool: Pool): void {
  app.get<{ Querystring: unknown }>('/v1/admin/audit', async (request, reply) => {
    const q = Q.parse(request.query);
    const log = new AuditLog(pool);
    const filter: import('../../audit/chain.js').AuditFilter = {};
    if (q.workspaceId) filter.workspaceId = q.workspaceId;
    if (q.actorId) filter.actorId = q.actorId;
    if (q.action) filter.action = q.action;
    if (q.resourceType) filter.resourceType = q.resourceType;
    if (q.dateFrom) filter.dateFrom = q.dateFrom;
    if (q.dateTo) filter.dateTo = q.dateTo;
    const entries = await log.query(filter, q.limit, q.offset);
    if (q.format === 'csv') return reply.type('text/csv').send(log.exportCsv(entries));
    if (q.format === 'jsonl') return reply.type('application/x-ndjson').send(log.exportJson(entries));
    return reply.send({ entries, limit: q.limit, offset: q.offset });
  });
}
