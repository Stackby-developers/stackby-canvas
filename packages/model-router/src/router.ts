import type { LLMRequest, LLMResponse, ProviderAdapter } from './providers/types.js';
import type { RouterConfig, ModelTier, Candidate, Provider } from './config/schema.js';
import type { BudgetCeiling, BudgetKey } from './budget/types.js';
import type { BudgetEnforcer } from './budget/enforcer.js';
import type { BudgetLedger } from './budget/ledger.js';
import { BudgetExceededError } from './budget/types.js';
import { guardPii } from './safety/pii-guard.js';
import { MetricsTracker } from './metrics/tracker.js';
import { AnthropicAdapter } from './providers/anthropic.js';
import { OpenAIAdapter } from './providers/openai.js';
import { GoogleAdapter } from './providers/google.js';
import { BedrockAdapter } from './providers/bedrock.js';
import { AzureAdapter } from './providers/azure.js';

export interface WorkspaceCredentials {
  workspaceId: string;
  providerKeys?: Partial<Record<Provider, string>>;
  allowedProviders?: Provider[];
  billingAccountId?: string;
}

export interface RouterCallOptions {
  budgetKey?: BudgetKey;
  budgetCeilings?: BudgetCeiling[];
  workspaceCredentials?: WorkspaceCredentials;
  runId?: string;
}

// Exported so tests can patch individual adapters
export const ADAPTERS: Record<Provider, ProviderAdapter> = {
  anthropic: new AnthropicAdapter(),
  openai: new OpenAIAdapter(),
  google: new GoogleAdapter(),
  bedrock: new BedrockAdapter(),
  azure: new AzureAdapter(),
};

function estimateCostUsd(candidate: Candidate, tokensIn: number, tokensOut: number): number {
  return (tokensIn / 1_000_000) * candidate.costPerMTokenIn
    + (tokensOut / 1_000_000) * candidate.costPerMTokenOut;
}

function actualCostUsd(candidate: Candidate, usage: LLMResponse['usage']): number {
  return (usage.tokensIn / 1_000_000) * candidate.costPerMTokenIn
    + (usage.tokensOut / 1_000_000) * candidate.costPerMTokenOut
    + (usage.cacheReadTokens / 1_000_000) * candidate.cacheReadCostPerMToken;
}

function makeTimeout<T = never>(ms: number, label: string): Promise<T> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
  );
}

export class ModelRouter {
  private readonly metrics: MetricsTracker;

  constructor(
    private readonly config: RouterConfig,
    private readonly systemApiKeys: Partial<Record<Provider, string>>,
    private readonly enforcer?: BudgetEnforcer,
    private readonly ledger?: BudgetLedger,
  ) {
    this.metrics = new MetricsTracker();
  }

  async call(
    request: LLMRequest,
    tier: ModelTier,
    options: RouterCallOptions = {},
  ): Promise<LLMResponse> {
    // Safety — refuse PII before any network call
    guardPii(request);

    const tierConfig = this.config.tiers[tier];
    if (!tierConfig) throw new Error(`Unknown tier: ${tier}`);

    let candidates = tierConfig.candidates;

    // Apply workspace allowed-provider filter
    if (options.workspaceCredentials?.allowedProviders?.length) {
      const allowed = new Set(options.workspaceCredentials.allowedProviders);
      candidates = candidates.filter((c) => allowed.has(c.provider));
      if (!candidates.length) {
        throw new Error(`No candidates for tier ${tier} with workspace's allowed providers`);
      }
    }

    const errors: Error[] = [];

    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i]!;
      const adapter = ADAPTERS[candidate.provider];

      const apiKey =
        options.workspaceCredentials?.providerKeys?.[candidate.provider] ??
        this.systemApiKeys[candidate.provider];

      if (!apiKey) {
        errors.push(new Error(`No API key for provider ${candidate.provider}`));
        continue;
      }

      // Pre-check budget with a rough estimate
      if (this.enforcer && options.budgetKey && options.budgetCeilings?.length) {
        const estimated = estimateCostUsd(candidate, 1000, 500);
        try {
          await this.enforcer.check(options.budgetKey, options.budgetCeilings, estimated);
        } catch (err) {
          if (err instanceof BudgetExceededError) throw err;
          errors.push(err instanceof Error ? err : new Error(String(err)));
          continue;
        }
      }

      // One retry per candidate on transient failure
      for (let attempt = 1; attempt <= 2; attempt++) {
        const attemptStart = Date.now();
        try {
          const response = await Promise.race([
            adapter.call(request, candidate, apiKey),
            makeTimeout(candidate.timeoutMs, `${candidate.provider}/${candidate.model}`),
          ]);

          const cost = actualCostUsd(candidate, response.usage);

          if (this.ledger && options.budgetKey) {
            await this.ledger.record(options.budgetKey, cost);
          }

          this.metrics.record({
            provider: candidate.provider,
            modelId: candidate.model,
            tier,
            attempt: i * 2 + attempt,
            success: true,
            latencyMs: Date.now() - attemptStart,
            tokensIn: response.usage.tokensIn,
            tokensOut: response.usage.tokensOut,
            cacheReadTokens: response.usage.cacheReadTokens,
            costUsd: cost,
            cacheHit: response.cacheHit,
          });

          return response;
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          this.metrics.record({
            provider: candidate.provider,
            modelId: candidate.model,
            tier,
            attempt: i * 2 + attempt,
            success: false,
            latencyMs: Date.now() - attemptStart,
            tokensIn: 0,
            tokensOut: 0,
            cacheReadTokens: 0,
            costUsd: 0,
            cacheHit: false,
            error: error.message,
          });

          if (attempt === 2) errors.push(error);
        }
      }
    }

    const summary = errors.map((e, idx) => `Candidate ${idx + 1}: ${e.message}`).join(' | ');
    throw new Error(`All candidates for tier ${tier} failed: ${summary}`);
  }

  getMetrics(): MetricsTracker {
    return this.metrics;
  }

  resetMetrics(): void {
    this.metrics.reset();
  }
}
