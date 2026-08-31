import { describe, it, expect } from 'vitest';
import { AnthropicAdapter } from '../providers/anthropic.js';
import { OpenAIAdapter } from '../providers/openai.js';
import { GoogleAdapter } from '../providers/google.js';
import { BedrockAdapter } from '../providers/bedrock.js';
import { AzureAdapter } from '../providers/azure.js';
import type { Candidate } from '../config/schema.js';

const STUB_CANDIDATE: Candidate = {
  provider: 'google',
  model: 'gemini-pro',
  maxTokens: 100,
  temperature: 0.5,
  timeoutMs: 5000,
  costPerMTokenIn: 0,
  costPerMTokenOut: 0,
  cacheReadCostPerMToken: 0,
  supportsVision: false,
  supportsTools: false,
  zeroRetention: false,
};

describe('provider adapter interface compliance', () => {
  const adapters = [
    new AnthropicAdapter(),
    new OpenAIAdapter(),
    new GoogleAdapter(),
    new BedrockAdapter(),
    new AzureAdapter(),
  ];

  for (const adapter of adapters) {
    it(`${adapter.provider} has provider string and call function`, () => {
      expect(typeof adapter.provider).toBe('string');
      expect(typeof adapter.call).toBe('function');
    });
  }

  it('GoogleAdapter throws with install instructions', async () => {
    const adapter = new GoogleAdapter();
    await expect(
      adapter.call({ messages: [] }, STUB_CANDIDATE, 'key')
    ).rejects.toThrow('@google/generative-ai');
  });

  it('BedrockAdapter throws with install instructions', async () => {
    const adapter = new BedrockAdapter();
    const cand = { ...STUB_CANDIDATE, provider: 'bedrock' as const };
    await expect(
      adapter.call({ messages: [] }, cand, 'creds')
    ).rejects.toThrow('@aws-sdk/client-bedrock-runtime');
  });

  it('AzureAdapter throws with deployment name', async () => {
    const adapter = new AzureAdapter();
    const cand = { ...STUB_CANDIDATE, provider: 'azure' as const, model: 'my-deployment' };
    await expect(
      adapter.call({ messages: [] }, cand, 'key')
    ).rejects.toThrow('my-deployment');
  });
});
