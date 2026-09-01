import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { GitHubAdapter } from '../providers/github.js';
import { InstallationStore } from '../store/installations.js';
import { RepoLinkStore } from '../store/links.js';
import { checkReadBackSync } from '../sync/read-back.js';
import type { Config } from '../config.js';

export function registerSyncRoute(app: FastifyInstance, pool: Pool, config: Config): void {
  app.get<{ Params: { linkId: string } }>('/git/sync/:linkId', async (request, reply) => {
    const links = new RepoLinkStore(pool);
    const link = await links.getById(request.params.linkId);
    if (!link) return reply.status(404).send({ error: 'Link not found' });

    const installations = new InstallationStore(pool, config.TOKEN_ENCRYPTION_KEY);
    const token = await installations.getToken(link.workspaceId, link.provider);
    if (!token) return reply.status(403).send({ error: 'No installation token' });

    const adapter = new GitHubAdapter();
    const result = await checkReadBackSync(adapter, link.repo, link.branch, link.lastStudioSha, token);
    return reply.send(result);
  });
}
