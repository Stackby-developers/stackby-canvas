import type { ProviderAdapter, RemoteDiff } from '../providers/types.js';

export interface SyncCheckResult {
  diverged: boolean;
  lastStudioSha: string;
  remoteSha: string;
  diff?: RemoteDiff;
}

/**
 * Check if the remote branch has commits Studio did not make.
 * Returns the diff when diverged. NEVER overwrites silently.
 */
export async function checkReadBackSync(
  adapter: ProviderAdapter,
  repo: string,
  branch: string,
  lastStudioSha: string,
  token: string,
): Promise<SyncCheckResult> {
  const status = await adapter.getRemoteStatus(repo, branch, token);

  if (!status.exists) {
    return { diverged: false, lastStudioSha, remoteSha: '' };
  }

  if (status.headSha === lastStudioSha) {
    return { diverged: false, lastStudioSha, remoteSha: status.headSha };
  }

  const diff = await adapter.getDiff(repo, lastStudioSha, status.headSha, token);
  return { diverged: true, lastStudioSha, remoteSha: status.headSha, diff };
}
