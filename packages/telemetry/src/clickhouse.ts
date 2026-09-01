import { request } from 'undici';

export interface RunStepRecord {
  runId: string;
  projectId: string;
  stepName: string;
  modelId: string;
  tokensIn: number;
  tokensOut: number;
  cachedTokens: number;
  latencyMs: number;
  costUsd: number;
  outcome: 'success' | 'failure' | 'retry';
  errorMessage?: string;
  createdAt: Date;
}

export class ClickHouseWriter {
  constructor(
    private readonly baseUrl: string,
    private readonly database = 'studio',
  ) {}

  async writeRunStep(record: RunStepRecord): Promise<void> {
    const row = this.toTabSeparated(record);
    const sql = `INSERT INTO ${this.database}.run_steps FORMAT TabSeparated`;
    const { statusCode } = await request(`${this.baseUrl}/?query=${encodeURIComponent(sql)}`, {
      method: 'POST',
      body: row + '\n',
    });
    if (statusCode !== 200) throw new Error(`ClickHouse write failed: ${statusCode}`);
  }

  async writeBatch(records: RunStepRecord[]): Promise<void> {
    if (records.length === 0) return;
    const rows = records.map((r) => this.toTabSeparated(r)).join('\n');
    const sql = `INSERT INTO ${this.database}.run_steps FORMAT TabSeparated`;
    const { statusCode } = await request(`${this.baseUrl}/?query=${encodeURIComponent(sql)}`, {
      method: 'POST',
      body: rows + '\n',
    });
    if (statusCode !== 200) throw new Error(`ClickHouse batch write failed: ${statusCode}`);
  }

  private toTabSeparated(r: RunStepRecord): string {
    return [
      r.runId, r.projectId, r.stepName, r.modelId,
      r.tokensIn, r.tokensOut, r.cachedTokens, r.latencyMs,
      r.costUsd, r.outcome, r.errorMessage ?? '',
      r.createdAt.toISOString().replace('T', ' ').slice(0, 19),
    ].join('\t');
  }
}
