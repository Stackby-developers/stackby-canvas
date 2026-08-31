import Anthropic from '@anthropic-ai/sdk';
import type { ProviderAdapter, LLMRequest, LLMResponse, Message } from './types.js';
import type { Candidate } from '../config/schema.js';

export class AnthropicAdapter implements ProviderAdapter {
  readonly provider = 'anthropic' as const;

  async call(request: LLMRequest, candidate: Candidate, apiKey: string): Promise<LLMResponse> {
    const client = new Anthropic({ apiKey });
    const start = Date.now();

    const messages = buildAnthropicMessages(request.messages);

    type SystemBlock = Anthropic.TextBlockParam & { cache_control?: { type: 'ephemeral' } };
    let system: string | SystemBlock[] | undefined;
    if (request.systemPrompt) {
      if (request.cacheablePrefix) {
        system = [
          { type: 'text', text: request.cacheablePrefix, cache_control: { type: 'ephemeral' } } satisfies SystemBlock,
          { type: 'text', text: request.systemPrompt },
        ];
      } else {
        system = request.systemPrompt;
      }
    }

    const params: Anthropic.MessageCreateParamsNonStreaming = {
      model: candidate.model,
      max_tokens: request.maxTokens ?? candidate.maxTokens,
      temperature: request.temperature ?? candidate.temperature,
      messages,
      ...(system !== undefined ? { system } : {}),
    };

    const response = await client.messages.create(params);
    const latencyMs = Date.now() - start;

    const content = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');

    type ExtendedUsage = Anthropic.Usage & {
      cache_read_input_tokens?: number;
      cache_creation_input_tokens?: number;
    };
    const usage = response.usage as ExtendedUsage;

    return {
      content,
      usage: {
        tokensIn: usage.input_tokens,
        tokensOut: usage.output_tokens,
        cacheReadTokens: usage.cache_read_input_tokens ?? 0,
        cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
      },
      modelId: candidate.model,
      provider: 'anthropic',
      latencyMs,
      cacheHit: (usage.cache_read_input_tokens ?? 0) > 0,
      finishReason: response.stop_reason === 'max_tokens' ? 'max_tokens' : 'stop',
    };
  }
}

function buildAnthropicMessages(messages: Message[]): Anthropic.MessageParam[] {
  return messages
    .filter((m) => m.role !== 'system')
    .map((m): Anthropic.MessageParam => ({
      role: m.role as 'user' | 'assistant',
      content: typeof m.content === 'string'
        ? m.content
        : m.content.map((p) => {
            if (p.type === 'image' && p.image) {
              return {
                type: 'image' as const,
                source: {
                  type: 'base64' as const,
                  media_type: p.image.mediaType as 'image/png',
                  data: p.image.base64,
                },
              };
            }
            type CacheableTextBlock = Anthropic.TextBlockParam & { cache_control?: { type: 'ephemeral' } };
            const block: CacheableTextBlock = { type: 'text', text: p.text ?? '' };
            if (p.cache) block.cache_control = { type: 'ephemeral' };
            return block;
          }),
    }));
}
