import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { captureScreenshots } from '../screenshot/playwright.js';

const ScreenshotBodySchema = z.object({
  deploymentUrl: z.string().url(),
  breakpoints: z.array(z.union([z.literal(375), z.literal(768), z.literal(1440)])).default([375, 768, 1440]),
});

export function registerScreenshotRoute(app: FastifyInstance, timeoutMs: number): void {
  app.post('/screenshot', async (request, reply) => {
    const { deploymentUrl } = ScreenshotBodySchema.parse(request.body);
    const screenshots = await captureScreenshots(deploymentUrl, 'req', timeoutMs);
    return reply.send({ screenshots });
  });
}
