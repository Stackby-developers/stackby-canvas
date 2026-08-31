import Anthropic from '@anthropic-ai/sdk';
import type { Config } from '../../config.js';

export type ModelTier = 'T0' | 'T1' | 'T2' | 'T3';

export interface LLMCallOptions {
  tier: ModelTier;
  prompt: string;
  systemPrompt?: string;
  images?: Array<{ base64: string; mediaType: string }>;
  maxTokens?: number;
}

export interface LLMCallResult {
  content: string;
  modelId: string;
  tokensIn: number;
  tokensOut: number;
  cachedTokens: number;
  latencyMs: number;
  cost: number;
}

export type LLMRouter = (opts: LLMCallOptions) => Promise<LLMCallResult>;

const COST_PER_MTK: Record<string, { in: number; out: number; cache: number }> = {
  'claude-haiku-4-5-20251001': { in: 0.00025, out: 0.00125, cache: 0.00003 },
  'claude-sonnet-5': { in: 0.003, out: 0.015, cache: 0.0003 },
  'claude-opus-5': { in: 0.015, out: 0.075, cache: 0.0015 },
};

export function createLLMRouter(config: Pick<Config, 'ANTHROPIC_API_KEY' | 'MODEL_T0' | 'MODEL_T1' | 'MODEL_T2' | 'MODEL_T3'>): LLMRouter {
  const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
  const tierModel: Record<ModelTier, string> = {
    T0: config.MODEL_T0,
    T1: config.MODEL_T1,
    T2: config.MODEL_T2,
    T3: config.MODEL_T3,
  };

  return async function callLLM(opts: LLMCallOptions): Promise<LLMCallResult> {
    const modelId = tierModel[opts.tier];
    const start = Date.now();

    const content: Anthropic.MessageParam['content'] = opts.images?.length
      ? [
          ...opts.images.map((img) => ({
            type: 'image' as const,
            source: { type: 'base64' as const, media_type: img.mediaType as 'image/png', data: img.base64 },
          })),
          { type: 'text' as const, text: opts.prompt },
        ]
      : opts.prompt;

    const response = await client.messages.create({
      model: modelId,
      max_tokens: opts.maxTokens ?? 8192,
      ...(opts.systemPrompt ? { system: opts.systemPrompt } : {}),
      messages: [{ role: 'user', content }],
    });

    const latencyMs = Date.now() - start;
    const tokensIn = response.usage.input_tokens;
    const tokensOut = response.usage.output_tokens;
    const cachedTokens = (response.usage as { cache_read_input_tokens?: number }).cache_read_input_tokens ?? 0;
    const pricing = COST_PER_MTK[modelId] ?? COST_PER_MTK['claude-sonnet-5']!;
    const cost =
      (tokensIn / 1_000_000) * pricing.in +
      (tokensOut / 1_000_000) * pricing.out +
      (cachedTokens / 1_000_000) * pricing.cache;

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');

    return { content: text, modelId, tokensIn, tokensOut, cachedTokens, latencyMs, cost };
  };
}
