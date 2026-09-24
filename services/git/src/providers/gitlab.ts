import { request } from 'undici';
import type { ProviderAdapter, RepoCreateOptions, FileToPush, PullRequestOptions, PullRequestResult, RemoteStatus, RemoteDiff, PushedCommit } from './types.js';

const GITLAB_BASE = process.env['GITLAB_BASE_URL'] ?? 'https://gitlab.com';

async function glRequest(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  token: string,
  body?: unknown,
): Promise<{ statusCode: number; data: unknown }> {
  const { statusCode, body: responseBody } = await request(`${GITLAB_BASE}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Stackby-Studio/1.0',
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await responseBody.json();
  return { statusCode, data };
}

function encodedPath(repo: string): string {
  return encodeURIComponent(repo);
}

export class GitLabAdapter implements ProviderAdapter {
  readonly provider = 'gitlab' as const;

  async createRepo(options: RepoCreateOptions, token: string): Promise<{ url: string; cloneUrl: string; defaultBranch: string }> {
    // Resolve namespace ID from orgOrUser
    let namespaceId: number | undefined;
    if (options.orgOrUser) {
      const { data: nsData } = await glRequest('GET', `/api/v4/namespaces?search=${encodeURIComponent(options.orgOrUser)}`, token);
      const namespaces = nsData as Array<{ id: number; path: string }>;
      const match = namespaces.find((ns) => ns.path.toLowerCase() === options.orgOrUser.toLowerCase());
      if (match) namespaceId = match.id;
    }

    const { statusCode, data } = await glRequest('POST', '/api/v4/projects', token, {
      name: options.name,
      ...(options.description !== undefined ? { description: options.description } : {}),
      visibility: options.visibility === 'private' ? 'private' : 'public',
      initialize_with_readme: false,
      default_branch: 'main',
      ...(namespaceId !== undefined ? { namespace_id: namespaceId } : {}),
    });

    if (statusCode !== 201) {
      throw new Error(`GitLab createRepo failed (${statusCode}): ${JSON.stringify(data)}`);
    }

    const project = data as { web_url: string; http_url_to_repo: string; default_branch: string };
    return { url: project.web_url, cloneUrl: project.http_url_to_repo, defaultBranch: project.default_branch };
  }

  async createBranch(repo: string, branch: string, fromSha: string, token: string): Promise<void> {
    const { statusCode, data } = await glRequest(
      'POST',
      `/api/v4/projects/${encodedPath(repo)}/repository/branches`,
      token,
      { branch, ref: fromSha },
    );
    if (statusCode !== 201) {
      throw new Error(`GitLab createBranch failed (${statusCode}): ${JSON.stringify(data)}`);
    }
  }

  async pushFiles(repo: string, branch: string, files: FileToPush[], message: string, token: string): Promise<PushedCommit> {
    const toActions = (action: 'create' | 'update') =>
      files.map((f) => ({
        action,
        file_path: f.path,
        content: f.encoding === 'base64' ? f.content : Buffer.from(f.content).toString('base64'),
        encoding: 'base64',
      }));

    let { statusCode, data } = await glRequest(
      'POST',
      `/api/v4/projects/${encodedPath(repo)}/repository/commits`,
      token,
      { branch, commit_message: message, actions: toActions('create') },
    );

    // If any file already exists GitLab returns 400; retry everything as 'update'
    if (statusCode === 400) {
      ({ statusCode, data } = await glRequest(
        'POST',
        `/api/v4/projects/${encodedPath(repo)}/repository/commits`,
        token,
        { branch, commit_message: message, actions: toActions('update') },
      ));
    }

    if (statusCode !== 201) {
      throw new Error(`GitLab pushFiles failed (${statusCode}): ${JSON.stringify(data)}`);
    }

    const commit = data as { id: string; web_url: string };
    return { sha: commit.id, url: commit.web_url };
  }

  async createPR(repo: string, options: PullRequestOptions, token: string): Promise<PullRequestResult> {
    const { statusCode, data } = await glRequest(
      'POST',
      `/api/v4/projects/${encodedPath(repo)}/merge_requests`,
      token,
      {
        source_branch: options.sourceBranch,
        target_branch: options.targetBranch,
        title: options.title,
        description: options.body ?? '',
        ...(options.draft ? { draft: true } : {}),
      },
    );

    if (statusCode !== 201) {
      throw new Error(`GitLab createPR failed (${statusCode}): ${JSON.stringify(data)}`);
    }

    const mr = data as { id: number; web_url: string; iid: number };
    return { id: mr.id, url: mr.web_url, number: mr.iid };
  }

  async getRemoteStatus(repo: string, branch: string, token: string): Promise<RemoteStatus> {
    const { statusCode, data } = await glRequest(
      'GET',
      `/api/v4/projects/${encodedPath(repo)}/repository/branches/${encodeURIComponent(branch)}`,
      token,
    );

    if (statusCode === 404) {
      return { headSha: '', branch, exists: false };
    }

    if (statusCode !== 200) {
      throw new Error(`GitLab getRemoteStatus failed (${statusCode}): ${JSON.stringify(data)}`);
    }

    const b = data as { commit: { id: string } };
    return { headSha: b.commit.id, branch, exists: true };
  }

  async getDiff(repo: string, baseSha: string, headSha: string, token: string): Promise<RemoteDiff> {
    const { statusCode, data } = await glRequest(
      'GET',
      `/api/v4/projects/${encodedPath(repo)}/repository/compare?from=${baseSha}&to=${headSha}`,
      token,
    );

    if (statusCode !== 200) {
      throw new Error(`GitLab getDiff failed (${statusCode}): ${JSON.stringify(data)}`);
    }

    const compare = data as {
      diffs: Array<{ new_path: string; old_path: string; new_file: boolean; deleted_file: boolean; diff?: string }>;
      commits: Array<{ id: string }>;
    };

    return {
      aheadBy: compare.commits.length,
      files: compare.diffs.map((d) => ({
        path: d.new_path,
        status: d.new_file ? 'added' : d.deleted_file ? 'removed' : 'modified',
        ...(d.diff !== undefined ? { patch: d.diff } : {}),
      })) as Array<{ path: string; status: 'added' | 'modified' | 'removed'; patch?: string }>,
    };
  }

  async getFileContent(repo: string, path: string, ref: string, token: string): Promise<string | null> {
    const { statusCode, data } = await glRequest(
      'GET',
      `/api/v4/projects/${encodedPath(repo)}/repository/files/${encodeURIComponent(path)}?ref=${encodeURIComponent(ref)}`,
      token,
    );

    if (statusCode === 404) return null;

    if (statusCode !== 200) {
      throw new Error(`GitLab getFileContent failed (${statusCode}): ${JSON.stringify(data)}`);
    }

    const file = data as { content: string; encoding: string };
    if (file.encoding === 'base64' && file.content) {
      return Buffer.from(file.content.replace(/\n/g, ''), 'base64').toString('utf-8');
    }
    return null;
  }
}
