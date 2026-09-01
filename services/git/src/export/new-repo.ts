import type { ProviderAdapter, FileToPush } from '../providers/types.js';
import { scanFiles, SecretScanError } from '../secrets/scanner.js';

export interface ExportNewRepoInput {
  repoName: string;
  orgOrUser: string;
  visibility: 'public' | 'private';
  files: FileToPush[];
  commitMessage: string;
  defaultBranch?: string;
}

export interface ExportNewRepoResult {
  repoUrl: string;
  cloneUrl: string;
  sha: string;
  branch: string;
}

export async function exportToNewRepo(
  adapter: ProviderAdapter,
  input: ExportNewRepoInput,
  token: string,
): Promise<ExportNewRepoResult> {
  const scan = scanFiles(input.files.map((f) => ({ path: f.path, content: f.content })));
  if (!scan.clean) throw new SecretScanError(scan.matches);

  const repo = await adapter.createRepo({
    name: input.repoName,
    orgOrUser: input.orgOrUser,
    visibility: input.visibility,
  }, token);

  const branch = input.defaultBranch ?? 'main';

  const pushed = await adapter.pushFiles(
    `${input.orgOrUser}/${input.repoName}`,
    branch,
    input.files,
    input.commitMessage,
    token,
  );

  return { repoUrl: repo.url, cloneUrl: repo.cloneUrl, sha: pushed.sha, branch };
}
