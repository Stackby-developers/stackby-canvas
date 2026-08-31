export interface CallAttemptRecord {
  provider: string;
  modelId: string;
  tier: string;
  attempt: number;
  success: boolean;
  latencyMs: number;
  tokensIn: number;
  tokensOut: number;
  cacheReadTokens: number;
  costUsd: number;
  cacheHit: boolean;
  error?: string;
}

export interface AggregateMetrics {
  totalCalls: number;
  totalCostUsd: number;
  totalTokensIn: number;
  totalTokensOut: number;
  totalCacheReadTokens: number;
  /** Fraction 0–1: calls with cacheHit=true / total calls */
  cacheHitRate: number;
  avgLatencyMs: number;
  /** Number of calls where attempt > 1 (primary failed, fell over to another) */
  failoverCount: number;
}

export class MetricsTracker {
  private readonly attempts: CallAttemptRecord[] = [];

  record(attempt: CallAttemptRecord): void {
    this.attempts.push(attempt);
  }

  getAttempts(): readonly CallAttemptRecord[] {
    return this.attempts;
  }

  aggregate(): AggregateMetrics {
    const total = this.attempts.length;
    if (total === 0) {
      return {
        totalCalls: 0, totalCostUsd: 0, totalTokensIn: 0, totalTokensOut: 0,
        totalCacheReadTokens: 0, cacheHitRate: 0, avgLatencyMs: 0, failoverCount: 0,
      };
    }
    const successful = this.attempts.filter((a) => a.success);
    const totalCostUsd = this.attempts.reduce((s, a) => s + a.costUsd, 0);
    const totalTokensIn = this.attempts.reduce((s, a) => s + a.tokensIn, 0);
    const totalTokensOut = this.attempts.reduce((s, a) => s + a.tokensOut, 0);
    const totalCacheReadTokens = this.attempts.reduce((s, a) => s + a.cacheReadTokens, 0);
    const cacheHits = this.attempts.filter((a) => a.cacheHit).length;
    const avgLatencyMs =
      successful.length > 0
        ? successful.reduce((s, a) => s + a.latencyMs, 0) / successful.length
        : 0;
    const failoverCount = this.attempts.filter((a) => a.attempt > 1).length;

    return {
      totalCalls: total,
      totalCostUsd,
      totalTokensIn,
      totalTokensOut,
      totalCacheReadTokens,
      cacheHitRate: cacheHits / total,
      avgLatencyMs,
      failoverCount,
    };
  }

  reset(): void {
    this.attempts.length = 0;
  }
}
