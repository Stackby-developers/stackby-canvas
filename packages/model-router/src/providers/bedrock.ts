import type { ProviderAdapter, LLMRequest, LLMResponse } from './types.js';
import type { Candidate } from '../config/schema.js';

export class BedrockAdapter implements ProviderAdapter {
  readonly provider = 'bedrock' as const;

  async call(_request: LLMRequest, candidate: Candidate, _credentials: string): Promise<LLMResponse> {
    // Production implementation uses @aws-sdk/client-bedrock-runtime
    throw new Error(`Bedrock adapter not configured for model ${candidate.model}. Install @aws-sdk/client-bedrock-runtime and implement.`);
  }
}
