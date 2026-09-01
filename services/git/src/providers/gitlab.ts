import type { ProviderAdapter, RepoCreateOptions, FileToPush, PullRequestOptions, PullRequestResult, RemoteStatus, RemoteDiff, PushedCommit } from './types.js';

/**
 * GitLab OAuth implementation stub.
 *
 * PRODUCTION WIRING REQUIRED:
 * 1. Create a GitLab OAuth application at https://gitlab.com/-/profile/applications
 *    Scopes: api, read_repository, write_repository
 * 2. Implement token refresh (GitLab tokens expire after 2 hours)
 * 3. For self-hosted GitLab: update GITLAB_BASE_URL in config
 * 4. API differences from GitHub:
 *    - Projects use numeric IDs or "namespace/project-name" paths
 *    - Branches: POST /projects/:id/repository/branches
 *    - Batch commits: POST /projects/:id/repository/commits
 *    - MRs: POST /projects/:id/merge_requests
 */
export class GitLabAdapter implements ProviderAdapter {
  readonly provider = 'gitlab' as const;

  async createRepo(_options: RepoCreateOptions, _token: string) {
    throw new Error('GitLab createRepo not yet implemented. See src/providers/gitlab.ts for production wiring notes.');
    return { url: '', cloneUrl: '', defaultBranch: 'main' };
  }

  async createBranch(_repo: string, _branch: string, _fromSha: string, _token: string) {
    throw new Error('GitLab createBranch not yet implemented.');
  }

  async pushFiles(_repo: string, _branch: string, _files: FileToPush[], _message: string, _token: string): Promise<PushedCommit> {
    throw new Error('GitLab pushFiles not yet implemented.');
  }

  async createPR(_repo: string, _options: PullRequestOptions, _token: string): Promise<PullRequestResult> {
    throw new Error('GitLab createPR (MR) not yet implemented.');
  }

  async getRemoteStatus(_repo: string, _branch: string, _token: string): Promise<RemoteStatus> {
    throw new Error('GitLab getRemoteStatus not yet implemented.');
  }

  async getDiff(_repo: string, _baseSha: string, _headSha: string, _token: string): Promise<RemoteDiff> {
    throw new Error('GitLab getDiff not yet implemented.');
  }

  async getFileContent(_repo: string, _path: string, _ref: string, _token: string): Promise<string | null> {
    throw new Error('GitLab getFileContent not yet implemented.');
  }
}
