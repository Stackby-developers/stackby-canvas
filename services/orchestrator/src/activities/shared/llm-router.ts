import { ModelRouter, loadRouterConfig } from '@stackby/model-router';
import type { LLMRequest } from '@stackby/model-router';
import type { ModelTier } from '@stackby/model-router';
import type { Config } from '../../config.js';

export type { ModelTier };

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

export function createLLMRouter(config: Pick<Config, 'ANTHROPIC_API_KEY'>): LLMRouter {
  const routerConfig = loadRouterConfig();
  const systemKeys: Partial<Record<'anthropic' | 'openai' | 'google' | 'bedrock' | 'azure', string>> = {
    anthropic: config.ANTHROPIC_API_KEY,
  };
  const openaiKey = process.env['OPENAI_API_KEY'];
  if (openaiKey) systemKeys.openai = openaiKey;
  const googleKey = process.env['GOOGLE_API_KEY'];
  if (googleKey) systemKeys.google = googleKey;

  const router = new ModelRouter(routerConfig, systemKeys);

  return async function callLLM(opts: LLMCallOptions): Promise<LLMCallResult> {
    const messages: LLMRequest['messages'] = [
      {
        role: 'user',
        content: opts.images?.length
          ? [
              ...opts.images.map((img) => ({
                type: 'image' as const,
                image: { base64: img.base64, mediaType: img.mediaType },
              })),
              { type: 'text' as const, text: opts.prompt },
            ]
          : opts.prompt,
      },
    ];

    const req: LLMRequest = { messages };
    if (opts.systemPrompt !== undefined) req.systemPrompt = opts.systemPrompt;
    if (opts.maxTokens !== undefined) req.maxTokens = opts.maxTokens;

    const response = await router.call(req, opts.tier);

    // Cost is reported by the router via its ledger; re-derive for the result payload
    // using the actual usage from the response rather than config constants.
    const cost =
      (response.usage.tokensIn / 1_000_000) * 3.0 +
      (response.usage.tokensOut / 1_000_000) * 15.0 +
      (response.usage.cacheReadTokens / 1_000_000) * 0.30;

    return {
      content: response.content,
      modelId: response.modelId,
      tokensIn: response.usage.tokensIn,
      tokensOut: response.usage.tokensOut,
      cachedTokens: response.usage.cacheReadTokens,
      latencyMs: response.latencyMs,
      cost,
    };
  };
}
