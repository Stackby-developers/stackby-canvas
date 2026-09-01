import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import type { Config } from '../../config.js';
import { CreditLedger } from '../../credit/ledger.js';
import { PolicyEnforcer } from '../../credit/limits.js';
import { computeRunCredits } from '../../credit/pricer.js';
import { AuditLog } from '../../audit/chain.js';
import { randomUUID } from 'node:crypto';

const B = z.object({
  workspaceId: z.string(),
  userId: z.string().optional(),
  projectId: z.string().optional(),
  runId: z.string().optional(),
  workflowId: z.string().optional(),
  llmCosts: z.array(z.object({ tier: z.string(), tokensIn: z.number().int(), tokensOut: z.number().int(), cacheReadTokens: z.number().int().default(0) })).default([]),
  includeSandbox: z.boolean().default(true),
  includePreview: z.boolean().default(true),
});

export function registerDebitRoute(app: FastifyInstance, pool: Pool, config: Config): void {
  app.post<{ Body: unknown }>('/v1/credits/debit', async (request, reply) => {
    const body = B.parse(request.body);
    const ledger = new CreditLedger(pool);
    const enforcer = new PolicyEnforcer(pool, ledger, config.DEFAULT_MONTHLY_CAP);
    const { totalCredits, llmCredits, sandboxCredits, previewCredits } = computeRunCredits(body.llmCosts, config.CREDIT_MULTIPLIER);
    const actualTotal = totalCredits - (body.includeSandbox ? 0 : sandboxCredits) - (body.includePreview ? 0 : previewCredits);

    await enforcer.checkCanRun(body.workspaceId, actualTotal, body.runId, body.workflowId);
    const debitInput: Parameters<typeof ledger.debit>[0] = { workspaceId: body.workspaceId, amount: actualTotal, reason: `Run ${body.runId ?? 'unknown'}` };
    if (body.userId) debitInput.userId = body.userId;
    if (body.projectId) debitInput.projectId = body.projectId;
    if (body.runId) debitInput.runId = body.runId;
    const entry = await ledger.debit(debitInput);

    const auditEntry: Parameters<InstanceType<typeof AuditLog>['append']>[0] = { id: randomUUID(), workspaceId: body.workspaceId, actorId: body.userId ?? 'system', action: 'credits.debit', resourceType: 'run', metadata: { amount: actualTotal, breakdown: { llmCredits, sandboxCredits, previewCredits } }, createdAt: new Date() };
    if (body.runId) auditEntry.resourceId = body.runId;
    await new AuditLog(pool).append(auditEntry);

    return reply.send({ ...entry, breakdown: { llmCredits, sandboxCredits, previewCredits } });
  });
}
