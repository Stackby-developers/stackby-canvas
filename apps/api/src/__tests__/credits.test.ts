import { describe, it, expect } from 'vitest';
import { computeRunCredits, estimateRunCredits, SANDBOX_CREDITS, PREVIEW_CREDITS } from '../credit/pricer.js';

describe('credit pricer', () => {
  it('charges T0 at cheaper rate than T2', () => {
    const t0 = computeRunCredits([{ tier: 'T0', tokensIn: 1_000_000, tokensOut: 1_000_000, cacheReadTokens: 0 }], 1);
    const t2 = computeRunCredits([{ tier: 'T2', tokensIn: 1_000_000, tokensOut: 1_000_000, cacheReadTokens: 0 }], 1);
    expect(t0.llmCredits).toBeLessThan(t2.llmCredits);
  });

  it('applies multiplier to LLM cost', () => {
    const x1 = computeRunCredits([{ tier: 'T1', tokensIn: 1_000_000, tokensOut: 0, cacheReadTokens: 0 }], 1);
    const x2 = computeRunCredits([{ tier: 'T1', tokensIn: 1_000_000, tokensOut: 0, cacheReadTokens: 0 }], 2);
    expect(x2.llmCredits).toBeGreaterThan(x1.llmCredits);
  });

  it('total = llm + sandbox + preview', () => {
    const result = computeRunCredits([], 1.5);
    expect(result.totalCredits).toBe(result.llmCredits + SANDBOX_CREDITS + PREVIEW_CREDITS);
  });

  it('cache read tokens cost less than input tokens (same tier)', () => {
    const withCache = computeRunCredits([{ tier: 'T2', tokensIn: 0, tokensOut: 0, cacheReadTokens: 1_000_000 }], 1);
    const withInput = computeRunCredits([{ tier: 'T2', tokensIn: 1_000_000, tokensOut: 0, cacheReadTokens: 0 }], 1);
    expect(withCache.llmCredits).toBeLessThan(withInput.llmCredits);
  });

  it('estimateRunCredits returns positive total', () => {
    const estimate = estimateRunCredits('dashboard', 500, 3, 1.5);
    expect(estimate.estimatedCredits).toBeGreaterThan(0);
    expect(estimate.breakdown.sandbox).toBe(SANDBOX_CREDITS);
    expect(estimate.breakdown.preview).toBe(PREVIEW_CREDITS);
  });

  it('portal costs more than form', () => {
    const portal = estimateRunCredits('portal', 500, 3, 1.5);
    const form = estimateRunCredits('form', 500, 1, 1.5);
    expect(portal.estimatedCredits).toBeGreaterThan(form.estimatedCredits);
  });
});
