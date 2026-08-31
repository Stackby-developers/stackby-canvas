import type { ProviderAdapter, LLMRequest, LLMResponse } from './types.js';
import type { Candidate } from '../config/schema.js';

export class GoogleAdapter implements ProviderAdapter {
  readonly provider = 'google' as const;

  async call(_request: LLMRequest, candidate: Candidate, _apiKey: string): Promise<LLMResponse> {
    // Production implementation uses @google/generative-ai
    throw new Error(`Google adapter not configured for model ${candidate.model}. Install @google/generative-ai and implement.`);
  }
}
