import { describe, it, expect, vi } from 'vitest';
import { checkReadBackSync } from '../sync/read-back.js';
import type { ProviderAdapter } from '../providers/types.js';

function makeMockAdapter(remoteStatus: { exists: boolean; headSha: string }): ProviderAdapter {
  return {
    provider: 'github',
    createRepo: vi.fn(),
    createBranch: vi.fn(),
    pushFiles: vi.fn(),
    createPR: vi.fn(),
    getRemoteStatus: vi.fn().mockResolvedValue({ ...remoteStatus, branch: 'main' }),
    getDiff: vi.fn().mockResolvedValue({
      aheadBy: 2,
      files: [{ path: 'src/App.tsx', status: 'modified', patch: '@@ -1,3 +1,4 @@' }],
    }),
    getFileContent: vi.fn(),
  } as unknown as ProviderAdapter;
}

describe('read-back sync', () => {
  it('no divergence when remote SHA matches last Studio SHA', async () => {
    const adapter = makeMockAdapter({ exists: true, headSha: 'abc123' });
    const result = await checkReadBackSync(adapter, 'org/repo', 'main', 'abc123', 'tok');
    expect(result.diverged).toBe(false);
    expect(adapter.getDiff as ReturnType<typeof vi.fn>).not.toHaveBeenCalled();
  });

  it('returns diverged=true with diff when remote has new commits', async () => {
    const adapter = makeMockAdapter({ exists: true, headSha: 'newsha456' });
    const result = await checkReadBackSync(adapter, 'org/repo', 'main', 'oldsha123', 'tok');
    expect(result.diverged).toBe(true);
    expect(result.diff?.aheadBy).toBe(2);
    expect(result.diff?.files[0]?.path).toBe('src/App.tsx');
  });

  it('never clobbers silently — exportToExistingRepo throws SYNC_DIVERGED error', async () => {
    const { exportToExistingRepo } = await import('../export/existing-repo.js');
    const adapter = makeMockAdapter({ exists: true, headSha: 'newsha456' });
    const err = await exportToExistingRepo(adapter, {
      repo: 'org/repo',
      baseBranch: 'main',
      newBranch: 'studio/update',
      files: [{ path: 'src/App.tsx', content: 'new content' }],
      commitMessage: 'Update',
      prTitle: 'Studio update',
      prBody: 'Body',
      lastStudioSha: 'oldsha123',
    }, 'tok').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error & { code: string }).code).toBe('SYNC_DIVERGED');
  });

  it('branch does not exist → not diverged', async () => {
    const adapter = makeMockAdapter({ exists: false, headSha: '' });
    const result = await checkReadBackSync(adapter, 'org/repo', 'new-branch', 'anysha', 'tok');
    expect(result.diverged).toBe(false);
    expect(result.remoteSha).toBe('');
  });

  it('diff is included in diverged result', async () => {
    const adapter = makeMockAdapter({ exists: true, headSha: 'remote-head' });
    const result = await checkReadBackSync(adapter, 'org/repo', 'main', 'old-head', 'tok');
    expect(result.diff).toBeDefined();
    expect(result.diff!.files).toHaveLength(1);
  });
});
