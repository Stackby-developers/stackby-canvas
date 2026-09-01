import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { GitHubAdapter } from '../providers/github.js';
import { InstallationStore } from '../store/installations.js';
import { RepoLinkStore } from '../store/links.js';
import { exportToNewRepo } from '../export/new-repo.js';
import { generateStandaloneFiles } from '../export/standalone-files.js';
import { generateReadme } from '../readme/generator.js';
import type { Config } from '../config.js';

const ExportNewBodySchema = z.object({
  projectId: z.string(),
  workspaceId: z.string(),
  repoName: z.string().regex(/^[a-z0-9-]{3,50}$/),
  orgOrUser: z.string(),
  visibility: z.enum(['public', 'private']).default('private'),
  provider: z.enum(['github', 'gitlab']).default('github'),
  artifactName: z.string(),
  artifactType: z.string(),
  description: z.string().default(''),
  stackId: z.string(),
  stackName: z.string(),
  bindings: z.array(z.object({ componentId: z.string(), tableId: z.string(), tableName: z.string(), columnIds: z.array(z.string()) })).default([]),
  sourceFiles: z.array(z.object({ path: z.string(), content: z.string() })).default([]),
});

export function registerExportNewRoute(app: FastifyInstance, pool: Pool, config: Config): void {
  app.post('/git/export/new', async (request, reply) => {
    const body = ExportNewBodySchema.parse(request.body);
    const installations = new InstallationStore(pool, config.TOKEN_ENCRYPTION_KEY);
    const token = await installations.getToken(body.workspaceId, body.provider);
    if (!token) return reply.status(403).send({ error: `No ${body.provider} installation found for this workspace` });

    const readme = generateReadme({ ...body, sdkVersion: config.SDK_VERSION, repoName: body.repoName });
    const files = generateStandaloneFiles({ ...body, sdkVersion: config.SDK_VERSION, readmeContent: readme });

    const adapter = new GitHubAdapter();
    const result = await exportToNewRepo(adapter, {
      repoName: body.repoName,
      orgOrUser: body.orgOrUser,
      visibility: body.visibility,
      files,
      commitMessage: `Initial export from Stackby Studio`,
    }, token);

    const links = new RepoLinkStore(pool);
    const link = await links.create({
      projectId: body.projectId,
      workspaceId: body.workspaceId,
      provider: body.provider,
      repo: `${body.orgOrUser}/${body.repoName}`,
      branch: result.branch,
      lastStudioSha: result.sha,
      continuousPush: false,
    });

    return reply.status(201).send({ ...result, linkId: link.id });
  });
}
