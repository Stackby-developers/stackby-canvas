import { describe, it, expect } from 'vitest';
import type { FileOperation } from '@stackby/schema-types';

describe('activity idempotency — applyOperations', () => {
  it('rejects duplicate writes to the same path', async () => {
    const { applyOperations } = await import('../activities/apply-operations.js');
    const fileOps: FileOperation[] = [
      { op: 'write', path: 'src/App.tsx', content: 'A' },
      { op: 'write', path: 'src/App.tsx', content: 'B' },
    ];
    await expect(
      applyOperations({ runId: 'r1', projectId: 'p1', stackId: 's1', workflowId: 'w1', fileOps }),
    ).rejects.toThrow('Duplicate write to path: src/App.tsx');
  });

  it('accepts distinct paths', async () => {
    const { applyOperations } = await import('../activities/apply-operations.js');
    const result = await applyOperations({
      runId: 'r1', projectId: 'p1', stackId: 's1', workflowId: 'w1',
      fileOps: [
        { op: 'write', path: 'src/App.tsx', content: 'A' },
        { op: 'write', path: 'src/components/Header.tsx', content: 'B' },
      ],
    });
    expect(result.paths).toHaveLength(2);
    expect(result.paths).toContain('src/App.tsx');
    expect(result.paths).toContain('src/components/Header.tsx');
  });

  it('handles delete and rename ops without counting them as write paths', async () => {
    const { applyOperations } = await import('../activities/apply-operations.js');
    const result = await applyOperations({
      runId: 'r1', projectId: 'p1', stackId: 's1', workflowId: 'w1',
      fileOps: [
        { op: 'write', path: 'src/App.tsx', content: 'A' },
        { op: 'delete', path: 'src/Old.tsx' },
        { op: 'rename', from: 'src/Foo.tsx', to: 'src/Bar.tsx' },
      ],
    });
    expect(result.paths).toHaveLength(1);
    expect(result.paths[0]).toBe('src/App.tsx');
  });

  it('empty fileOps returns empty paths', async () => {
    const { applyOperations } = await import('../activities/apply-operations.js');
    const result = await applyOperations({ runId: 'r1', projectId: 'p1', stackId: 's1', workflowId: 'w1', fileOps: [] });
    expect(result.paths).toHaveLength(0);
  });
});
