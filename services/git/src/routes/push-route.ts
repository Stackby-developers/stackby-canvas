import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { GitHubAdapter } from '../providers/github.js';
import { InstallationStore } from '../store/installations.js';
import { RepoLinkStore } from '../store/links.js';
import { scanFiles, SecretScanError } from '../secrets/scanner.js';
import type { Config } from '../config.js';

const PushBodySchema = z.object({
  files: z.array(z.object({ path: z.string(), content: z.string() })),
  commitMessage: z.string(),
  openPR: z.boolean().default(false),
  prTitle: z.string().optional(),
  prBody: z.string().optional(),
});

export function registerPushRoute(app: FastifyInstance, pool: Pool, config: Config): void {
  app.post<{ Params: { linkId: string }; Body: unknown }>('/git/push/:linkId', async (request, reply) => {
    const body = PushBodySchema.parse(request.body);
    const links = new RepoLinkStore(pool);
    const link = await links.getById(request.params.linkId);
    if (!link) return reply.status(404).send({ error: 'Link not found' });

    const scan = scanFiles(body.files);
    if (!scan.clean) {
      return reply.status(422).send({ error: 'Secret scan failed', matches: scan.matches });
    }

    const installations = new InstallationStore(pool, config.TOKEN_ENCRYPTION_KEY);
    const token = await installations.getToken(link.workspaceId, link.provider);
    if (!token) return reply.status(403).send({ error: 'No installation token' });

    const adapter = new GitHubAdapter();
    const pushed = await adapter.pushFiles(link.repo, link.branch, body.files, body.commitMessage, token);
    await links.updateSha(link.id, pushed.sha);

    return reply.send({ sha: pushed.sha, url: pushed.url });
  });
}
