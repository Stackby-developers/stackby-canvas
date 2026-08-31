import { describe, it, expect } from 'vitest';
import { MetricsTracker } from '../metrics/tracker.js';

const REPLAYED_MONTH = [
  { provider: 'anthropic', model: 'claude-haiku-4-5-20251001', tokensIn: 1_200_000, tokensOut: 400_000, cacheReadTokens: 300_000, rateIn: 0.25, rateOut: 1.25, rateCache: 0.03 },
  { provider: 'anthropic', model: 'claude-sonnet-5',           tokensIn:   800_000, tokensOut: 200_000, cacheReadTokens: 100_000, rateIn: 3.00, rateOut: 15.0, rateCache: 0.30 },
  { provider: 'openai',    model: 'gpt-4o-mini',               tokensIn: 2_000_000, tokensOut: 500_000, cacheReadTokens:       0, rateIn: 0.15, rateOut: 0.60, rateCache: 0.00 },
];

describe('cost reconciliation', () => {
  it('computed total is within 2% of expected for a replayed call set', () => {
    const tracker = new MetricsTracker();
    let expected = 0;

    for (const row of REPLAYED_MONTH) {
      const cost =
        (row.tokensIn / 1e6) * row.rateIn +
        (row.tokensOut / 1e6) * row.rateOut +
        (row.cacheReadTokens / 1e6) * row.rateCache;
      expected += cost;

      tracker.record({
        provider: row.provider,
        modelId: row.model,
        tier: 'T1',
        attempt: 1,
        success: true,
        latencyMs: 300,
        tokensIn: row.tokensIn,
        tokensOut: row.tokensOut,
        cacheReadTokens: row.cacheReadTokens,
        costUsd: cost,
        cacheHit: row.cacheReadTokens > 0,
      });
    }

    const agg = tracker.aggregate();
    const deviation = Math.abs(agg.totalCostUsd - expected) / expected;
    expect(deviation).toBeLessThan(0.02);
  });

  it('cache hit rate is a first-class metric', () => {
    const tracker = new MetricsTracker();
    tracker.record({ provider: 'anthropic', modelId: 'm', tier: 'T0', attempt: 1, success: true, latencyMs: 100, tokensIn: 100, tokensOut: 50, cacheReadTokens: 80, costUsd: 0.001, cacheHit: true });
    tracker.record({ provider: 'anthropic', modelId: 'm', tier: 'T0', attempt: 1, success: true, latencyMs: 100, tokensIn: 100, tokensOut: 50, cacheReadTokens:  0, costUsd: 0.001, cacheHit: false });
    expect(tracker.aggregate().cacheHitRate).toBe(0.5);
  });

  it('failoverCount counts attempts > 1', () => {
    const tracker = new MetricsTracker();
    tracker.record({ provider: 'anthropic', modelId: 'm', tier: 'T0', attempt: 1, success: false, latencyMs: 10, tokensIn: 0, tokensOut: 0, cacheReadTokens: 0, costUsd: 0, cacheHit: false, error: 'timeout' });
    tracker.record({ provider: 'openai',    modelId: 'n', tier: 'T0', attempt: 2, success: true,  latencyMs: 50, tokensIn: 10, tokensOut: 5, cacheReadTokens: 0, costUsd: 0.001, cacheHit: false });
    expect(tracker.aggregate().failoverCount).toBe(1);
  });

  it('aggregate returns zeros when no records', () => {
    const tracker = new MetricsTracker();
    const agg = tracker.aggregate();
    expect(agg.totalCalls).toBe(0);
    expect(agg.cacheHitRate).toBe(0);
  });
});
