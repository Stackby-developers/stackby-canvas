import { SignJWT, importPKCS8 } from 'jose';
import { request } from 'undici';
import type { ProviderAdapter, RepoCreateOptions, FileToPush, PullRequestOptions, PullRequestResult, RemoteStatus, RemoteDiff, PushedCommit } from './types.js';

const GITHUB_API = 'https://api.github.com';

async function githubRequest(method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE', path: string, token: string, body?: unknown): Promise<{ statusCode: number; data: unknown }> {
  const { statusCode, body: responseBody } = await request(`${GITHUB_API}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      'User-Agent': 'Stackby-Studio/1.0',
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await responseBody.json();
  return { statusCode, data };
}

export async function generateGitHubAppJWT(appId: string, privateKeyPem: string): Promise<string> {
  const privateKey = await importPKCS8(privateKeyPem, 'RS256');
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuedAt(now - 60)
    .setExpirationTime(now + 600)
    .setIssuer(appId)
    .sign(privateKey);
}

export async function getInstallationToken(installationId: string, appJwt: string): Promise<string> {
  const { statusCode, data } = await githubRequest('POST', `/app/installations/${installationId}/access_tokens`, appJwt);
  if (statusCode !== 201) throw new Error(`Failed to get installation token: ${statusCode}`);
  return (data as { token: string }).token;
}

export class GitHubAdapter implements ProviderAdapter {
  readonly provider = 'github' as const;

  async createRepo(options: RepoCreateOptions, token: string) {
    const path = options.orgOrUser ? `/orgs/${options.orgOrUser}/repos` : '/user/repos';
    const { data } = await githubRequest('POST', path, token, {
      name: options.name,
      description: options.description ?? '',
      private: options.visibility === 'private',
      auto_init: false,
    });
    const repo = data as { html_url: string; clone_url: string; default_branch: string };
    return { url: repo.html_url, cloneUrl: repo.clone_url, defaultBranch: repo.default_branch };
  }

  async createBranch(repo: string, branch: string, fromSha: string, token: string) {
    await githubRequest('POST', `/repos/${repo}/git/refs`, token, {
      ref: `refs/heads/${branch}`,
      sha: fromSha,
    });
  }

  async pushFiles(repo: string, branch: string, files: FileToPush[], message: string, token: string): Promise<PushedCommit> {
    const treeItems = files.map((f) => ({ path: f.path, mode: '100644', type: 'blob', content: f.content }));
    const { data: refData } = await githubRequest('GET', `/repos/${repo}/git/ref/heads/${branch}`, token);
    const baseSha = (refData as { object: { sha: string } }).object.sha;
    const { data: treeData } = await githubRequest('POST', `/repos/${repo}/git/trees`, token, { base_tree: baseSha, tree: treeItems });
    const treeSha = (treeData as { sha: string }).sha;
    const { data: commitData } = await githubRequest('POST', `/repos/${repo}/git/commits`, token, { message, tree: treeSha, parents: [baseSha] });
    const commitSha = (commitData as { sha: string; html_url: string }).sha;
    await githubRequest('PATCH', `/repos/${repo}/git/refs/heads/${branch}`, token, { sha: commitSha });
    return { sha: commitSha, url: (commitData as { sha: string; html_url: string }).html_url };
  }

  async createPR(repo: string, options: PullRequestOptions, token: string): Promise<PullRequestResult> {
    const { data } = await githubRequest('POST', `/repos/${repo}/pulls`, token, {
      title: options.title, body: options.body,
      head: options.sourceBranch, base: options.targetBranch,
      draft: options.draft ?? false,
    });
    const pr = data as { id: number; html_url: string; number: number };
    return { id: pr.id, url: pr.html_url, number: pr.number };
  }

  async getRemoteStatus(repo: string, branch: string, token: string): Promise<RemoteStatus> {
    const { statusCode, data } = await githubRequest('GET', `/repos/${repo}/git/ref/heads/${branch}`, token);
    if (statusCode === 404) return { headSha: '', branch, exists: false };
    return { headSha: (data as { object: { sha: string } }).object.sha, branch, exists: true };
  }

  async getDiff(repo: string, baseSha: string, headSha: string, token: string): Promise<RemoteDiff> {
    const { data } = await githubRequest('GET', `/repos/${repo}/compare/${baseSha}...${headSha}`, token);
    const c = data as { ahead_by: number; files?: Array<{ filename: string; status: string; patch?: string }> };
    return {
      aheadBy: c.ahead_by,
      files: (c.files ?? []).map((f) => ({
        path: f.filename,
        status: f.status as 'added' | 'modified' | 'removed',
        ...(f.patch !== undefined ? { patch: f.patch } : {}),
      })),
    };
  }

  async getFileContent(repo: string, path: string, ref: string, token: string): Promise<string | null> {
    const { statusCode, data } = await githubRequest('GET', `/repos/${repo}/contents/${path}?ref=${ref}`, token);
    if (statusCode === 404) return null;
    const file = data as { content?: string; encoding?: string };
    if (file.encoding === 'base64' && file.content) {
      return Buffer.from(file.content.replace(/\n/g, ''), 'base64').toString('utf-8');
    }
    return null;
  }
}
