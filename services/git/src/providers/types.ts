export type GitProvider = 'github' | 'gitlab';

export interface RepoCreateOptions {
  name: string;
  description?: string;
  visibility: 'public' | 'private';
  orgOrUser: string;
}

export interface FileToPush {
  path: string;
  content: string;
  encoding?: 'utf-8' | 'base64';
}

export interface PushedCommit {
  sha: string;
  url: string;
}

export interface PullRequestOptions {
  title: string;
  body: string;
  sourceBranch: string;
  targetBranch: string;
  draft?: boolean;
}

export interface PullRequestResult {
  id: number | string;
  url: string;
  number: number;
}

export interface RemoteStatus {
  headSha: string;
  branch: string;
  exists: boolean;
}

export interface RemoteDiff {
  files: Array<{ path: string; status: 'added' | 'modified' | 'removed'; patch?: string }>;
  aheadBy: number;
}

export interface ProviderAdapter {
  readonly provider: GitProvider;
  createRepo(options: RepoCreateOptions, token: string): Promise<{ url: string; cloneUrl: string; defaultBranch: string }>;
  createBranch(repo: string, branch: string, fromSha: string, token: string): Promise<void>;
  pushFiles(repo: string, branch: string, files: FileToPush[], message: string, token: string): Promise<PushedCommit>;
  createPR(repo: string, options: PullRequestOptions, token: string): Promise<PullRequestResult>;
  getRemoteStatus(repo: string, branch: string, token: string): Promise<RemoteStatus>;
  getDiff(repo: string, baseSha: string, headSha: string, token: string): Promise<RemoteDiff>;
  getFileContent(repo: string, path: string, ref: string, token: string): Promise<string | null>;
}
