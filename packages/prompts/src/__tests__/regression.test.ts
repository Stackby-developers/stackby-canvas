import { describe, it, expect } from 'vitest';
import { runEval } from '../../eval/runner.js';

describe('eval runner integration', () => {
  it('runs without blocking on clean baseline', async () => {
    const { blocked, report } = await runEval({ ciMode: true, updateBaseline: false });
    expect(blocked).toBe(false);
    expect(report).toContain('Eval Report');
    expect(report).toContain('build_success');
  }, 60_000);

  it('100% injection pass rate with mock outputs', async () => {
    const { report } = await runEval({ ciMode: false, updateBaseline: false, filter: 'injection' });
    expect(report).toContain('injection_pass_rate');
    expect(report).toContain('100.0%');
  }, 30_000);
});
