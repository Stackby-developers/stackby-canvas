import type { Provider, Candidate } from '../config/schema.js';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string | MessageContentPart[];
}

export interface MessageContentPart {
  type: 'text' | 'image';
  text?: string;
  image?: { base64: string; mediaType: string };
  /** Mark this text block as cacheable (Anthropic only) */
  cache?: boolean;
}

export interface Tool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface LLMRequest {
  messages: Message[];
  systemPrompt?: string;
  /** Mark stable prefix content as cacheable */
  cacheablePrefix?: string;
  tools?: Tool[];
  /** If set, expect JSON output */
  responseFormat?: 'text' | 'json';
  temperature?: number;
  maxTokens?: number;
  /** If set, scan and refuse PII-tagged field names */
  piiFields?: string[];
}

export interface LLMUsage {
  tokensIn: number;
  tokensOut: number;
  /** Tokens read from provider cache (not billed at full rate) */
  cacheReadTokens: number;
  /** Tokens written to provider cache */
  cacheWriteTokens: number;
}

export interface LLMResponse {
  content: string;
  toolCalls?: ToolCall[];
  usage: LLMUsage;
  modelId: string;
  provider: Provider;
  latencyMs: number;
  /** True if cacheReadTokens > 0 */
  cacheHit: boolean;
  finishReason: 'stop' | 'max_tokens' | 'tool_use' | 'error';
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ProviderAdapter {
  readonly provider: Provider;
  call(request: LLMRequest, candidate: Candidate, apiKey: string): Promise<LLMResponse>;
}
