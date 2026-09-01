const TIER_CREDITS: Record<string, { in: number; out: number; cacheRead: number }> = {
  T0: { in: 1,   out: 5,   cacheRead: 0.1 },
  T1: { in: 15,  out: 75,  cacheRead: 1.5 },
  T2: { in: 15,  out: 75,  cacheRead: 1.5 },
  T3: { in: 75,  out: 375, cacheRead: 7.5 },
};

export const SANDBOX_CREDITS = 5;
export const PREVIEW_CREDITS = 2;

export interface LLMCost {
  tier: string;
  tokensIn: number;
  tokensOut: number;
  cacheReadTokens: number;
}

export interface RunCostBreakdown {
  llmCredits: number;
  sandboxCredits: number;
  previewCredits: number;
  totalCredits: number;
}

export function computeRunCredits(llmCosts: LLMCost[], multiplier: number): RunCostBreakdown {
  let llmCredits = 0;
  for (const cost of llmCosts) {
    const rates = TIER_CREDITS[cost.tier] ?? TIER_CREDITS['T1']!;
    llmCredits +=
      (cost.tokensIn  / 1_000_000) * rates.in +
      (cost.tokensOut / 1_000_000) * rates.out +
      (cost.cacheReadTokens / 1_000_000) * rates.cacheRead;
  }
  llmCredits = Math.ceil(llmCredits * multiplier);
  return { llmCredits, sandboxCredits: SANDBOX_CREDITS, previewCredits: PREVIEW_CREDITS, totalCredits: llmCredits + SANDBOX_CREDITS + PREVIEW_CREDITS };
}

export interface PreviewEstimate {
  estimatedCredits: number;
  breakdown: { llm: number; sandbox: number; preview: number };
  note: string;
}

export function estimateRunCredits(
  artifactType: string,
  promptTokens: number,
  tableCount: number,
  multiplier: number,
): PreviewEstimate {
  const complexity = tableCount * 2 + (artifactType === 'portal' ? 3 : 1);
  const costs: LLMCost[] = [
    { tier: 'T1', tokensIn: promptTokens, tokensOut: 200, cacheReadTokens: 0 },
    { tier: 'T2', tokensIn: promptTokens + complexity * 500, tokensOut: complexity * 2000, cacheReadTokens: 0 },
    { tier: 'T3', tokensIn: 500, tokensOut: 200, cacheReadTokens: 0 },
  ];
  const { llmCredits, sandboxCredits, previewCredits, totalCredits } = computeRunCredits(costs, multiplier);
  return {
    estimatedCredits: totalCredits,
    breakdown: { llm: llmCredits, sandbox: sandboxCredits, preview: previewCredits },
    note: 'Estimate; actual cost depends on model responses.',
  };
}
