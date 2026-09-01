import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { FileOperation } from '@stackby/schema-types';
import { parseTypeScriptErrors } from '../pipeline/typecheck.js';
import { materialise, hashFiles } from '../pipeline/materialise.js';

describe('TypeScript error parsing', () => {
  it('parses a standard TS error line', () => {
    const out = `src/App.tsx(5,3): error TS2345: Argument of type 'number' is not assignable to parameter of type 'string'.`;
    const errors = parseTypeScriptErrors(out, '/workspace');
    expect(errors).toHaveLength(1);
    expect(errors[0]!.file).toBe('src/App.tsx');
    expect(errors[0]!.line).toBe(5);
    expect(errors[0]!.column).toBe(3);
    expect(errors[0]!.code).toBe('TS2345');
    expect(errors[0]!.severity).toBe('error');
    expect(errors[0]!.phase).toBe('typecheck');
  });

  it('returns empty array for clean output', () => {
    expect(parseTypeScriptErrors('', '/workspace')).toHaveLength(0);
    expect(parseTypeScriptErrors('Found 0 errors.', '/workspace')).toHaveLength(0);
  });

  it('strips the workDir prefix from file paths', () => {
    const out = '/workspace/src/App.tsx(1,1): error TS1234: Bad.';
    const errors = parseTypeScriptErrors(out, '/workspace');
    expect(errors[0]!.file).toBe('src/App.tsx');
  });

  it('parses multiple errors from multi-line output', () => {
    const out = [
      `src/A.tsx(1,1): error TS1001: First error.`,
      `src/B.tsx(2,4): error TS1002: Second error.`,
    ].join('\n');
    expect(parseTypeScriptErrors(out, '')).toHaveLength(2);
  });
});

describe('materialise', () => {
  it('writes files to a temp directory and cleanup removes them', async () => {
    const baseDir = join(tmpdir(), 'mat-test');
    const files: FileOperation[] = [
      { op: 'write', path: 'src/App.tsx', content: 'hello' },
      { op: 'write', path: 'src/index.ts', content: 'world' },
    ];
    const { workDir, cleanup } = await materialise(files, baseDir);
    expect(existsSync(join(workDir, 'src/App.tsx'))).toBe(true);
    expect(existsSync(join(workDir, 'src/index.ts'))).toBe(true);
    await cleanup();
    expect(existsSync(workDir)).toBe(false);
  });

  it('creates nested directories as needed', async () => {
    const { workDir, cleanup } = await materialise(
      [{ op: 'write', path: 'a/b/c/deep.ts', content: 'deep' }],
      tmpdir(),
    );
    expect(existsSync(join(workDir, 'a/b/c/deep.ts'))).toBe(true);
    await cleanup();
  });
});

describe('hashFiles', () => {
  it('produces deterministic hashes', async () => {
    const files: FileOperation[] = [{ op: 'write', path: 'a.ts', content: 'foo' }];
    const h1 = await hashFiles(files);
    const h2 = await hashFiles(files);
    expect(h1['a.ts']).toBe(h2['a.ts']);
  });

  it('produces different hashes for different content', async () => {
    const h1 = await hashFiles([{ op: 'write', path: 'a.ts', content: 'foo' }]);
    const h2 = await hashFiles([{ op: 'write', path: 'a.ts', content: 'bar' }]);
    expect(h1['a.ts']).not.toBe(h2['a.ts']);
  });

  it('ignores delete operations', async () => {
    const h = await hashFiles([{ op: 'delete', path: 'a.ts' }]);
    expect(h['a.ts']).toBeUndefined();
  });
});
