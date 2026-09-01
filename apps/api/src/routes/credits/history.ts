import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { CreditLedger } from '../../credit/ledger.js';

const Q = z.object({ workspaceId: z.string(), limit: z.coerce.number().int().default(50), offset: z.coerce.number().int().default(0) });

export function registerHistoryRoute(app: FastifyInstance, pool: Pool): void {
  app.get<{ Querystring: unknown }>('/v1/credits/history', async (request, reply) => {
    const { workspaceId, limit, offset } = Q.parse(request.query);
    return reply.send({ entries: await new CreditLedger(pool).getHistory(workspaceId, limit, offset), limit, offset });
  });
}
