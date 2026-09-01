import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { GitHubAdapter } from '../providers/github.js';
import { InstallationStore } from '../store/installations.js';
import { RepoLinkStore } from '../store/links.js';
import { exportToExistingRepo } from '../export/existing-repo.js';
import type { Config } from '../config.js';

const ExportExistingBodySchema = z.object({
  projectId: z.string(),
  workspaceId: z.string(),
  repo: z.string(),
  baseBranch: z.string().default('main'),
  newBranch: z.string(),
  provider: z.enum(['github', 'gitlab']).default('github'),
  files: z.array(z.object({ path: z.string(), content: z.string() })),
  commitMessage: z.string(),
  prTitle: z.string(),
  prBody: z.string(),
  linkId: z.string().optional(),
});

export function registerExportExistingRoute(app: FastifyInstance, pool: Pool, config: Config): void {
  app.post('/git/export/existing', async (request, reply) => {
    const body = ExportExistingBodySchema.parse(request.body);
    const installations = new InstallationStore(pool, config.TOKEN_ENCRYPTION_KEY);
    const token = await installations.getToken(body.workspaceId, body.provider);
    if (!token) return reply.status(403).send({ error: `No ${body.provider} installation found` });

    const links = new RepoLinkStore(pool);
    const link = body.linkId ? await links.getById(body.linkId) : null;

    const adapter = new GitHubAdapter();
    const result = await exportToExistingRepo(adapter, {
      repo: body.repo,
      baseBranch: body.baseBranch,
      newBranch: body.newBranch,
      files: body.files,
      commitMessage: body.commitMessage,
      prTitle: body.prTitle,
      prBody: body.prBody,
      ...(link?.lastStudioSha ? { lastStudioSha: link.lastStudioSha } : {}),
    }, token);

    if (link) await links.updateSha(link.id, result.sha);

    return reply.send(result);
  });
}
