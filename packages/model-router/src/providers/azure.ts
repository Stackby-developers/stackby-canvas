import type { ProviderAdapter, LLMRequest, LLMResponse } from './types.js';
import type { Candidate } from '../config/schema.js';

export class AzureAdapter implements ProviderAdapter {
  readonly provider = 'azure' as const;

  async call(_request: LLMRequest, candidate: Candidate, _apiKey: string): Promise<LLMResponse> {
    // Uses OpenAI SDK with custom baseURL — requires AZURE_OPENAI_ENDPOINT in config
    throw new Error(`Azure adapter not configured for deployment ${candidate.model}.`);
  }
}
