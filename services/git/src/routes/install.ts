import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { InstallationStore } from '../store/installations.js';
import type { Config } from '../config.js';

const InstallBodySchema = z.object({
  provider: z.enum(['github', 'gitlab']),
  installationId: z.string(),
  accessToken: z.string(),
  workspaceId: z.string(),
  installedByUserId: z.string(),
});

export function registerInstallRoute(app: FastifyInstance, pool: Pool, config: Config): void {
  app.post<{ Params: { provider: string }; Body: unknown }>(
    '/git/install/:provider',
    async (request, reply) => {
      const body = InstallBodySchema.parse(request.body);
      const store = new InstallationStore(pool, config.TOKEN_ENCRYPTION_KEY);
      const installation = await store.save(body);
      return reply.status(201).send({ installationId: installation.id });
    },
  );
}
