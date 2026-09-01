import { describe, it, expect } from 'vitest';
import { SPANS, ATTRS } from '../spans.js';

describe('span constants', () => {
  it('all required run spans are defined', () => {
    expect(SPANS.RUN).toBe('studio.run');
    expect(SPANS.LLM_CALL).toBeDefined();
    expect(SPANS.BUILD).toBeDefined();
    expect(SPANS.GATEWAY_READ).toBeDefined();
  });

  it('all required attribute keys are defined', () => {
    expect(ATTRS.RUN_ID).toBe('studio.run_id');
    expect(ATTRS.COST_USD).toBeDefined();
    expect(ATTRS.TOKENS_IN).toBeDefined();
    expect(ATTRS.PROMPT_VERSION).toBeDefined();
  });

  it('span names are all prefixed studio.*', () => {
    for (const name of Object.values(SPANS)) {
      expect(name).toMatch(/^studio\./);
    }
  });

  it('attribute keys are all prefixed studio.*', () => {
    for (const key of Object.values(ATTRS)) {
      expect(key).toMatch(/^studio\./);
    }
  });
});

describe('withSpan helper', () => {
  it('returns the value from the callback', async () => {
    const { withSpan } = await import('../index.js');
    const result = await withSpan('test.span', { 'test.attr': 'value' }, async () => 42);
    expect(result).toBe(42);
  });

  it('propagates errors from the callback', async () => {
    const { withSpan } = await import('../index.js');
    await expect(
      withSpan('test.error', {}, async () => { throw new Error('test error'); })
    ).rejects.toThrow('test error');
  });
});
