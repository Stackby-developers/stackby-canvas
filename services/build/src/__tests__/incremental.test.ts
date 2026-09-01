import { describe, it, expect } from 'vitest';
import { getIncrementalChanges, computeFileHash } from '../cache/incremental.js';
import type { FileOperation } from '@stackby/schema-types';

describe('incremental build cache', () => {
  it('detects a changed file and skips an unchanged one', () => {
    const files: FileOperation[] = [
      { op: 'write', path: 'src/App.tsx', content: 'v2 content' },
      { op: 'write', path: 'src/Header.tsx', content: 'unchanged' },
    ];
    const prev = {
      'src/App.tsx': computeFileHash('v1 content'),
      'src/Header.tsx': computeFileHash('unchanged'),
    };
    const curr = {
      'src/App.tsx': computeFileHash('v2 content'),
      'src/Header.tsx': computeFileHash('unchanged'),
    };

    const { changedFiles, incremental } = getIncrementalChanges(files, prev, curr);
    expect(changedFiles).toHaveLength(1);
    const f = changedFiles[0]!;
    expect(f.op === 'write' && f.path).toBe('src/App.tsx');
    expect(incremental).toBe(true);
  });

  it('returns all files when nothing was changed previously (first build)', () => {
    const files: FileOperation[] = [{ op: 'write', path: 'src/App.tsx', content: 'content' }];
    const { changedFiles, incremental } = getIncrementalChanges(
      files,
      {},
      { 'src/App.tsx': computeFileHash('content') },
    );
    expect(changedFiles).toHaveLength(1);
    expect(incremental).toBe(false);
  });

  it('always includes delete and rename operations regardless of hashes', () => {
    const files: FileOperation[] = [
      { op: 'delete', path: 'src/Old.tsx' },
      { op: 'rename', from: 'src/A.tsx', to: 'src/B.tsx' },
    ];
    const { changedFiles } = getIncrementalChanges(files, {}, {});
    expect(changedFiles).toHaveLength(2);
  });

  it('marks build as not incremental when all files changed', () => {
    const files: FileOperation[] = [
      { op: 'write', path: 'a.ts', content: 'new' },
      { op: 'write', path: 'b.ts', content: 'new' },
    ];
    const { incremental } = getIncrementalChanges(files, {}, {
      'a.ts': computeFileHash('new'),
      'b.ts': computeFileHash('new'),
    });
    expect(incremental).toBe(false);
  });

  it('computeFileHash is deterministic', () => {
    expect(computeFileHash('hello')).toBe(computeFileHash('hello'));
    expect(computeFileHash('hello')).not.toBe(computeFileHash('world'));
  });
});
