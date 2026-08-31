import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ModelRouter, ADAPTERS } from '../router.js';
import { setRouterConfig, clearConfigCache } from '../config/loader.js';
import type { RouterConfig } from '../config/schema.js';
import type { ProviderAdapter, LLMRequest, LLMResponse } from '../providers/types.js';
import type { Candidate } from '../config/schema.js';

function fakeResponse(content: string): LLMResponse {
  return {
    content,
    modelId: 'test-model',
    provider: 'openai',
    latencyMs: 5,
    cacheHit: false,
    finishReason: 'stop',
    usage: { tokensIn: 10, tokensOut: 5, cacheReadTokens: 0, cacheWriteTokens: 0 },
  };
}

const BASE_TIER = {
  label: 'test',
  useCases: [],
  candidates: [
    { provider: 'anthropic' as const, model: 'primary', maxTokens: 100, temperature: 0, timeoutMs: 5000, costPerMTokenIn: 0, costPerMTokenOut: 0, cacheReadCostPerMToken: 0, supportsVision: false, supportsTools: false, zeroRetention: true },
    { provider: 'openai' as const, model: 'fallback', maxTokens: 100, temperature: 0, timeoutMs: 5000, costPerMTokenIn: 0, costPerMTokenOut: 0, cacheReadCostPerMToken: 0, supportsVision: false, supportsTools: false, zeroRetention: false },
  ],
};

const SINGLE_TIER_CONFIG: RouterConfig = {
  version: '1',
  tiers: { T0: BASE_TIER, T1: BASE_TIER, T2: BASE_TIER, T3: BASE_TIER },
};

let savedAnthropic: ProviderAdapter;
let savedOpenai: ProviderAdapter;

beforeEach(() => {
  setRouterConfig(SINGLE_TIER_CONFIG);
  savedAnthropic = ADAPTERS['anthropic']!;
  savedOpenai = ADAPTERS['openai']!;
});

afterEach(() => {
  ADAPTERS['anthropic'] = savedAnthropic!;
  ADAPTERS['openai'] = savedOpenai!;
  clearConfigCache();
});

describe('ModelRouter failover', () => {
  it('transparently fails over when primary provider throws', async () => {
    let anthropicAttempts = 0;
    let openaiAttempts = 0;

    ADAPTERS['anthropic'] = {
      provider: 'anthropic',
      async call(_req: LLMRequest, _cand: Candidate, _key: string): Promise<LLMResponse> {
        anthropicAttempts++;
        throw new Error('Primary unavailable');
      },
    };
    ADAPTERS['openai'] = {
      provider: 'openai',
      async call(_req: LLMRequest, _cand: Candidate, _key: string): Promise<LLMResponse> {
        openaiAttempts++;
        return fakeResponse('fallback ok');
      },
    };

    const router = new ModelRouter(SINGLE_TIER_CONFIG, { anthropic: 'key-a', openai: 'key-b' });
    const result = await router.call({ messages: [{ role: 'user', content: 'hi' }] }, 'T0');

    expect(result.content).toBe('fallback ok');
    expect(anthropicAttempts).toBeGreaterThan(0);
    expect(openaiAttempts).toBe(1);

    const metrics = router.getMetrics().aggregate();
    expect(metrics.failoverCount).toBeGreaterThan(0);
  });

  it('throws when ALL candidates fail', async () => {
    ADAPTERS['anthropic'] = { provider: 'anthropic', call: async () => { throw new Error('Down'); } };
    ADAPTERS['openai'] = { provider: 'openai', call: async () => { throw new Error('Also down'); } };

    const router = new ModelRouter(SINGLE_TIER_CONFIG, { anthropic: 'k', openai: 'k' });
    await expect(
      router.call({ messages: [{ role: 'user', content: 'hi' }] }, 'T0')
    ).rejects.toThrow('All candidates');
  });

  it('succeeds on first candidate when primary works', async () => {
    ADAPTERS['anthropic'] = {
      provider: 'anthropic',
      call: async () => fakeResponse('primary ok'),
    };

    const router = new ModelRouter(SINGLE_TIER_CONFIG, { anthropic: 'key-a', openai: 'key-b' });
    const result = await router.call({ messages: [{ role: 'user', content: 'test' }] }, 'T0');

    expect(result.content).toBe('primary ok');
    expect(router.getMetrics().aggregate().failoverCount).toBe(0);
  });

  it('skips provider when no API key is configured', async () => {
    let openaiCalls = 0;
    ADAPTERS['openai'] = {
      provider: 'openai',
      call: async () => { openaiCalls++; return fakeResponse('openai'); },
    };

    // No anthropic key — should skip anthropic and use openai
    const router = new ModelRouter(SINGLE_TIER_CONFIG, { openai: 'key-b' });
    const result = await router.call({ messages: [{ role: 'user', content: 'test' }] }, 'T0');

    expect(result.content).toBe('openai');
    expect(openaiCalls).toBe(1);
  });

  it('respects workspace allowed-provider filter', async () => {
    let anthropicCalls = 0;
    ADAPTERS['anthropic'] = { provider: 'anthropic', call: async () => { anthropicCalls++; return fakeResponse('anthropic'); } };

    const router = new ModelRouter(SINGLE_TIER_CONFIG, { anthropic: 'k', openai: 'k' });
    const result = await router.call(
      { messages: [{ role: 'user', content: 'test' }] },
      'T0',
      { workspaceCredentials: { workspaceId: 'ws1', allowedProviders: ['anthropic'] } },
    );

    expect(result.content).toBe('anthropic');
    expect(anthropicCalls).toBe(1);
  });
});
