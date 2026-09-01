import type { Pool } from 'pg';
import { randomUUID } from 'node:crypto';

export interface LedgerEntry {
  id: string;
  workspaceId: string;
  runId?: string | undefined;
  amount: number;
  reason: string;
  createdAt: Date;
}

export interface Balance {
  workspaceId: string;
  totalCredits: number;
  usedCredits: number;
  balance: number;
  monthUsed: number;
}

export class CreditLedger {
  constructor(private readonly pool: Pool) {}

  async debit(input: { workspaceId: string; userId?: string; projectId?: string; runId?: string; amount: number; reason: string }): Promise<LedgerEntry> {
    const id = randomUUID();
    await this.pool.query(
      `INSERT INTO credit_ledger (id, workspace_id, run_id, amount, reason, created_at) VALUES ($1,$2,$3,$4,$5,NOW())`,
      [id, input.workspaceId, input.runId ?? null, -Math.abs(input.amount), input.reason],
    );
    await this.pool.query(
      `UPDATE workspaces SET credit_balance = credit_balance - $1 WHERE id = $2`,
      [Math.abs(input.amount), input.workspaceId],
    );
    const entry: LedgerEntry = { id, workspaceId: input.workspaceId, amount: -Math.abs(input.amount), reason: input.reason, createdAt: new Date() };
    if (input.runId) entry.runId = input.runId;
    return entry;
  }

  async credit(input: { workspaceId: string; amount: number; reason: string }): Promise<LedgerEntry> {
    const id = randomUUID();
    await this.pool.query(
      `INSERT INTO credit_ledger (id, workspace_id, run_id, amount, reason, created_at) VALUES ($1,$2,NULL,$3,$4,NOW())`,
      [id, input.workspaceId, Math.abs(input.amount), input.reason],
    );
    await this.pool.query(
      `UPDATE workspaces SET credit_balance = credit_balance + $1 WHERE id = $2`,
      [Math.abs(input.amount), input.workspaceId],
    );
    return { id, workspaceId: input.workspaceId, amount: Math.abs(input.amount), reason: input.reason, createdAt: new Date() };
  }

  async getBalance(workspaceId: string): Promise<Balance> {
    const { rows } = await this.pool.query(`SELECT credit_balance FROM workspaces WHERE id=$1`, [workspaceId]);
    const balance = rows[0]?.['credit_balance'] as number ?? 0;
    const { rows: agg } = await this.pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as total_credits,
         COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as used_credits,
         COALESCE(SUM(CASE WHEN amount < 0 AND created_at >= date_trunc('month', NOW()) THEN ABS(amount) ELSE 0 END), 0) as month_used
       FROM credit_ledger WHERE workspace_id=$1`,
      [workspaceId],
    );
    const r = agg[0];
    return {
      workspaceId,
      totalCredits: Number(r?.['total_credits'] ?? 0),
      usedCredits: Number(r?.['used_credits'] ?? 0),
      balance,
      monthUsed: Number(r?.['month_used'] ?? 0),
    };
  }

  async getHistory(workspaceId: string, limit = 50, offset = 0): Promise<LedgerEntry[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM credit_ledger WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [workspaceId, limit, offset],
    );
    return rows.map((r) => {
      const entry: LedgerEntry = {
        id: r['id'] as string,
        workspaceId: r['workspace_id'] as string,
        amount: r['amount'] as number,
        reason: r['reason'] as string,
        createdAt: new Date(r['created_at'] as string),
      };
      if (r['run_id']) entry.runId = r['run_id'] as string;
      return entry;
    });
  }
}
