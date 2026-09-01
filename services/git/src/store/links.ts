import type { Pool } from 'pg';
import type { GitProvider } from '../providers/types.js';
import { randomUUID } from 'node:crypto';

export interface RepoLink {
  id: string;
  projectId: string;
  workspaceId: string;
  provider: GitProvider;
  repo: string;
  branch: string;
  lastStudioSha: string;
  continuousPush: boolean;
  createdAt: Date;
}

export class RepoLinkStore {
  constructor(private readonly pool: Pool) {}

  async create(input: Omit<RepoLink, 'id' | 'createdAt'>): Promise<RepoLink> {
    const id = randomUUID();
    await this.pool.query(
      `INSERT INTO git_repo_links
       (id, project_id, workspace_id, provider, repo, branch, last_studio_sha, continuous_push, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())`,
      [id, input.projectId, input.workspaceId, input.provider, input.repo, input.branch, input.lastStudioSha, input.continuousPush],
    );
    return { id, ...input, createdAt: new Date() };
  }

  async updateSha(linkId: string, sha: string): Promise<void> {
    await this.pool.query(`UPDATE git_repo_links SET last_studio_sha=$1 WHERE id=$2`, [sha, linkId]);
  }

  async getById(id: string): Promise<RepoLink | null> {
    const { rows } = await this.pool.query(`SELECT * FROM git_repo_links WHERE id=$1`, [id]);
    if (!rows[0]) return null;
    const r = rows[0];
    return {
      id: r['id'] as string,
      projectId: r['project_id'] as string,
      workspaceId: r['workspace_id'] as string,
      provider: r['provider'] as GitProvider,
      repo: r['repo'] as string,
      branch: r['branch'] as string,
      lastStudioSha: r['last_studio_sha'] as string,
      continuousPush: r['continuous_push'] as boolean,
      createdAt: new Date(r['created_at'] as string),
    };
  }
}
