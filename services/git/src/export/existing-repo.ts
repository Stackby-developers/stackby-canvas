import type { ProviderAdapter, FileToPush, PullRequestResult } from '../providers/types.js';
import { scanFiles, SecretScanError } from '../secrets/scanner.js';
import { checkReadBackSync } from '../sync/read-back.js';

export interface ExportExistingRepoInput {
  repo: string;
  baseBranch: string;
  newBranch: string;
  files: FileToPush[];
  commitMessage: string;
  prTitle: string;
  prBody: string;
  lastStudioSha?: string;
}

export interface ExportExistingRepoResult {
  sha: string;
  pr: PullRequestResult;
  syncDiverged: boolean;
}

export async function exportToExistingRepo(
  adapter: ProviderAdapter,
  input: ExportExistingRepoInput,
  token: string,
): Promise<ExportExistingRepoResult> {
  const scan = scanFiles(input.files.map((f) => ({ path: f.path, content: f.content })));
  if (!scan.clean) throw new SecretScanError(scan.matches);

  if (input.lastStudioSha) {
    const syncResult = await checkReadBackSync(adapter, input.repo, input.baseBranch, input.lastStudioSha, token);
    if (syncResult.diverged) {
      throw Object.assign(
        new Error(`Remote branch "${input.baseBranch}" has ${syncResult.diff?.aheadBy ?? 0} commit(s) Studio did not make. Review the diff before exporting.`),
        { code: 'SYNC_DIVERGED', diff: syncResult.diff },
      );
    }
  }

  const status = await adapter.getRemoteStatus(input.repo, input.baseBranch, token);
  if (!status.exists) throw new Error(`Base branch "${input.baseBranch}" not found`);

  await adapter.createBranch(input.repo, input.newBranch, status.headSha, token);

  const pushed = await adapter.pushFiles(input.repo, input.newBranch, input.files, input.commitMessage, token);

  const pr = await adapter.createPR(input.repo, {
    title: input.prTitle,
    body: input.prBody,
    sourceBranch: input.newBranch,
    targetBranch: input.baseBranch,
  }, token);

  return { sha: pushed.sha, pr, syncDiverged: false };
}
