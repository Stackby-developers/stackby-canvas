import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import type { Config } from '../../config.js';
import { PolicyEnforcer } from '../../credit/limits.js';
import { CreditLedger } from '../../credit/ledger.js';

const B = z.object({
  workspaceId: z.string(),
  allowPublicPublishing: z.boolean().optional(),
  allowGitExport: z.boolean().optional(),
  allowedModelTiers: z.array(z.string()).optional(),
  monthlyCreditCap: z.number().int().positive().optional(),
  requireApprovalForPublish: z.boolean().optional(),
});

export function registerPolicyRoute(app: FastifyInstance, pool: Pool, config: Config): void {
  app.get<{ Querystring: { workspaceId: string } }>('/v1/admin/policy', async (request, reply) => {
    const enforcer = new PolicyEnforcer(pool, new CreditLedger(pool), config.DEFAULT_MONTHLY_CAP);
    return reply.send(await enforcer.getPolicy(request.query.workspaceId));
  });

  app.patch<{ Body: unknown }>('/v1/admin/policy', async (request, reply) => {
    const body = B.parse(request.body);
    const enforcer = new PolicyEnforcer(pool, new CreditLedger(pool), config.DEFAULT_MONTHLY_CAP);
    const current = await enforcer.getPolicy(body.workspaceId);
    const updated = {
      ...current,
      ...(body.allowPublicPublishing !== undefined ? { allowPublicPublishing: body.allowPublicPublishing } : {}),
      ...(body.allowGitExport !== undefined ? { allowGitExport: body.allowGitExport } : {}),
      ...(body.allowedModelTiers !== undefined ? { allowedModelTiers: body.allowedModelTiers } : {}),
      ...(body.monthlyCreditCap !== undefined ? { monthlyCreditCap: body.monthlyCreditCap } : {}),
      ...(body.requireApprovalForPublish !== undefined ? { requireApprovalForPublish: body.requireApprovalForPublish } : {}),
    };
    await enforcer.savePolicy(updated);
    return reply.send(updated);
  });
}
