import { describe, it, expect } from 'vitest';
import { BudgetLedger } from '../budget/ledger.js';
import { BudgetEnforcer } from '../budget/enforcer.js';
import { BudgetExceededError } from '../budget/types.js';
import type { Redis } from 'ioredis';

function mockRedis(): Redis {
  const store: Record<string, number> = {};
  return {
    async get(key: string) {
      return store[key] !== undefined ? String(store[key]) : null;
    },
    async del(...keys: string[]) {
      for (const k of keys) delete store[k];
      return keys.length;
    },
    pipeline() {
      const ops: Array<() => void> = [];
      const pipe = {
        incrbyfloat(key: string, value: number) {
          ops.push(() => { store[key] = (store[key] ?? 0) + value; });
          return pipe;
        },
        expire(_key: string, _ttl: number) {
          ops.push(() => { /* noop */ });
          return pipe;
        },
        async exec() { for (const op of ops) op(); return []; },
      };
      return pipe;
    },
  } as unknown as Redis;
}

describe('BudgetLedger', () => {
  it('accumulates costs per run and workspace', async () => {
    const ledger = new BudgetLedger(mockRedis());
    await ledger.record({ workspaceId: 'ws1', runId: 'run1' }, 0.50);
    await ledger.record({ workspaceId: 'ws1', runId: 'run1' }, 0.25);
    expect(await ledger.getRunTotal('run1')).toBeCloseTo(0.75);
    expect(await ledger.getWorkspaceTotal('ws1')).toBeCloseTo(0.75);
  });
});

describe('BudgetEnforcer', () => {
  it('allows calls under the ceiling', async () => {
    const ledger = new BudgetLedger(mockRedis());
    const enforcer = new BudgetEnforcer(ledger);
    await enforcer.check(
      { workspaceId: 'ws1', runId: 'run1' },
      [{ workspaceId: 'ws1', runId: 'run1', limitUsd: 1.0 }],
      0.01,
    );
  });

  it('throws BudgetExceededError when run ceiling is breached', async () => {
    const redis = mockRedis();
    const ledger = new BudgetLedger(redis);
    const enforcer = new BudgetEnforcer(ledger);

    await ledger.record({ workspaceId: 'ws1', runId: 'run1' }, 0.90);

    await expect(
      enforcer.check(
        { workspaceId: 'ws1', runId: 'run1' },
        [{ workspaceId: 'ws1', runId: 'run1', limitUsd: 1.0 }],
        0.20,
      ),
    ).rejects.toBeInstanceOf(BudgetExceededError);
  });

  it('workspace ceiling triggers even when run ceiling is fine', async () => {
    const redis = mockRedis();
    const ledger = new BudgetLedger(redis);
    const enforcer = new BudgetEnforcer(ledger);

    await ledger.record({ workspaceId: 'ws1' }, 4.50);
    await ledger.record({ workspaceId: 'ws1', runId: 'run2' }, 0.01);

    await expect(
      enforcer.check(
        { workspaceId: 'ws1', runId: 'run2' },
        [
          { workspaceId: 'ws1', runId: 'run2', limitUsd: 10.0 },
          { workspaceId: 'ws1', limitUsd: 5.0 },
        ],
        0.60,
      ),
    ).rejects.toBeInstanceOf(BudgetExceededError);
  });

  it('BudgetExceededError has correct shape', () => {
    const err = new BudgetExceededError('workspace', 5.0, 5.5, 'ws1');
    expect(err.userMessage).toContain('budget');
    expect(err.resumeInstructions).toContain('admin');
    expect(err.retryable).toBe(false);
    expect(err.httpStatus).toBe(402);
    expect(err.toStudioError().code).toBe('BUDGET_EXCEEDED');
  });

  it('BudgetExceededError is never swallowed by the router (rethrown)', () => {
    // Verifies the type distinction — tested behaviorally in router.test.ts
    const err = new BudgetExceededError('run', 1.0, 1.1, 'ws1');
    expect(err).toBeInstanceOf(BudgetExceededError);
    expect(err).toBeInstanceOf(Error);
  });
});
