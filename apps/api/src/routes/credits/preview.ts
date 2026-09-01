import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import type { Config } from '../../config.js';
import { estimateRunCredits } from '../../credit/pricer.js';

const B = z.object({ workspaceId: z.string(), artifactType: z.string(), promptTokens: z.number().int().default(500), tableCount: z.number().int().default(1) });

export function registerPreviewRoute(app: FastifyInstance, config: Config): void {
  app.post<{ Body: unknown }>('/v1/credits/preview', async (request, reply) => {
    const body = B.parse(request.body);
    return reply.send(estimateRunCredits(body.artifactType, body.promptTokens, body.tableCount, config.CREDIT_MULTIPLIER));
  });
}
