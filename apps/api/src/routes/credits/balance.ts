import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { CreditLedger } from '../../credit/ledger.js';

export function registerBalanceRoute(app: FastifyInstance, pool: Pool): void {
  app.get<{ Querystring: { workspaceId: string } }>('/v1/credits/balance', async (request, reply) => {
    const ledger = new CreditLedger(pool);
    return reply.send(await ledger.getBalance(request.query.workspaceId));
  });
}
