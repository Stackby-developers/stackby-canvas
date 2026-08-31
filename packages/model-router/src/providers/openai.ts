import OpenAI from 'openai';
import type { ProviderAdapter, LLMRequest, LLMResponse } from './types.js';
import type { Candidate } from '../config/schema.js';

export class OpenAIAdapter implements ProviderAdapter {
  readonly provider = 'openai' as const;

  async call(request: LLMRequest, candidate: Candidate, apiKey: string): Promise<LLMResponse> {
    const client = new OpenAI({ apiKey });
    const start = Date.now();

    const messages: OpenAI.ChatCompletionMessageParam[] = [];
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    for (const m of request.messages) {
      if (m.role === 'system') continue;
      if (typeof m.content === 'string') {
        if (m.role === 'assistant') {
          messages.push({ role: 'assistant', content: m.content });
        } else {
          messages.push({ role: 'user', content: m.content });
        }
      } else {
        // Multi-part content (images, etc.) — only 'user' supports this in OpenAI
        const parts: OpenAI.ChatCompletionContentPart[] = m.content.map((p) => {
          if (p.type === 'image' && p.image) {
            return {
              type: 'image_url' as const,
              image_url: { url: `data:${p.image.mediaType};base64,${p.image.base64}` },
            };
          }
          return { type: 'text' as const, text: p.text ?? '' };
        });
        messages.push({ role: 'user', content: parts });
      }
    }

    const createParams: OpenAI.ChatCompletionCreateParamsNonStreaming = {
      model: candidate.model,
      max_tokens: request.maxTokens ?? candidate.maxTokens,
      temperature: request.temperature ?? candidate.temperature,
      messages,
    };

    // json_object response format only available on gpt-4/gpt-3.5 series
    if (
      request.responseFormat === 'json' &&
      (candidate.model.includes('gpt-4') || candidate.model.includes('gpt-3.5'))
    ) {
      createParams.response_format = { type: 'json_object' };
    }

    const response = await client.chat.completions.create(createParams);
    const latencyMs = Date.now() - start;
    const choice = response.choices[0];

    return {
      content: choice?.message.content ?? '',
      usage: {
        tokensIn: response.usage?.prompt_tokens ?? 0,
        tokensOut: response.usage?.completion_tokens ?? 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
      },
      modelId: candidate.model,
      provider: 'openai',
      latencyMs,
      cacheHit: false,
      finishReason: choice?.finish_reason === 'length' ? 'max_tokens' : 'stop',
    };
  }
}
