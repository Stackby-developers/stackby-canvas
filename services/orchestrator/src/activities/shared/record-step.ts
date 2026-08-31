import type { Pool } from 'pg';

export interface StepRecord {
  runId: string;
  projectId: string;
  stepName: string;
  modelId: string;
  tokensIn: number;
  tokensOut: number;
  cachedTokens: number;
  latencyMs: number;
  cost: number;
  outcome: 'success' | 'failure' | 'retry';
  errorMessage?: string;
}

export async function recordStep(pool: Pool, step: StepRecord): Promise<void> {
  await pool.query(
    `INSERT INTO run_steps
     (run_id, project_id, step_name, model_id, tokens_in, tokens_out, cached_tokens, latency_ms, cost_usd, outcome, error_message)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     ON CONFLICT DO NOTHING`,
    [
      step.runId, step.projectId, step.stepName, step.modelId,
      step.tokensIn, step.tokensOut, step.cachedTokens,
      step.latencyMs, step.cost, step.outcome, step.errorMessage ?? null,
    ],
  );
}
