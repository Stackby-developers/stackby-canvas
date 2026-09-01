import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { buildElementMap } from '../screenshot/element-map.js';

const ElementMapBodySchema = z.object({ deploymentUrl: z.string().url() });

export function registerElementMapRoute(app: FastifyInstance, timeoutMs: number): void {
  app.post('/element-map', async (request, reply) => {
    const { deploymentUrl } = ElementMapBodySchema.parse(request.body);
    const elementMap = await buildElementMap(deploymentUrl, timeoutMs);
    return reply.send({ elementMap });
  });
}
