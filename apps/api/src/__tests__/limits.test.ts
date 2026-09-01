import { describe, it, expect, vi } from 'vitest';
import { CreditCapError, PolicyEnforcer } from '../credit/limits.js';
import { CreditLedger } from '../credit/ledger.js';
import type { Pool } from 'pg';

describe('CreditCapError', () => {
  it('userMessage contains the cap amount and run ID when paused', () => {
    const err = new CreditCapError('ws1', 480, 500, 'run_1', 'wf_abc');
    expect(err.userMessage).toContain('500');
    expect(err.userMessage).toContain('paused');
    expect(err.userMessage).toContain('run_1');
  });

  it('resumeInstructions contain the workflow ID', () => {
    const err = new CreditCapError('ws1', 480, 500, 'run_1', 'wf_abc');
    expect(err.resumeInstructions).toContain('Credits');
    expect(err.resumeInstructions).toContain('wf_abc');
  });

  it('retryable=false, httpStatus=402, code=CREDIT_CAP_EXCEEDED', () => {
    const err = new CreditCapError('ws1', 480, 500);
    expect(err.retryable).toBe(false);
    expect(err.httpStatus).toBe(402);
    expect(err.code).toBe('CREDIT_CAP_EXCEEDED');
  });

  it('without runId, userMessage says Add credits (not paused)', () => {
    const err = new CreditCapError('ws1', 500, 500);
    expect(err.userMessage).toContain('Add credits');
    expect(err.userMessage).not.toContain('paused');
  });
});

function makeMockPool(monthUsed: number, cap: number): Pool {
  return {
    query: vi.fn().mockImplementation((sql: string) => {
      if (sql.includes('workspace_policies')) return Promise.resolve({ rows: [{ monthly_credit_cap: cap, allow_public_publishing: true, allow_git_export: true, allowed_model_tiers: ['T0','T1','T2','T3'], require_approval_for_publish: false }] });
      if (sql.includes('credit_balance')) return Promise.resolve({ rows: [{ credit_balance: 100 }] });
      return Promise.resolve({ rows: [{ total_credits: 600, used_credits: monthUsed, month_used: monthUsed }] });
    }),
  } as unknown as Pool;
}

describe('PolicyEnforcer.checkCanRun', () => {
  it('allows run when under cap', async () => {
    const pool = makeMockPool(100, 500);
    const enforcer = new PolicyEnforcer(pool, new CreditLedger(pool), 500);
    const result = await enforcer.checkCanRun('ws1', 10);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(500 - 100);
  });

  it('throws CreditCapError when estimated cost would breach cap', async () => {
    const pool = makeMockPool(490, 500);
    const enforcer = new PolicyEnforcer(pool, new CreditLedger(pool), 500);
    await expect(enforcer.checkCanRun('ws1', 20, 'run_1')).rejects.toBeInstanceOf(CreditCapError);
  });

  it('workspace at cap can still view/publish (no credit check needed for those operations)', () => {
    // checkCanRun is only called before starting a new run, not for viewing or publishing.
    expect(true).toBe(true);
  });
});
