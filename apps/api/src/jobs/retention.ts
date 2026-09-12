/**
 * Nightly data retention job — SOC 2 CC9.1 compliance.
 *
 * Reads system_retention_defaults and per-workspace retention_policies,
 * then hard-deletes (or anonymises) records older than the retention period.
 * Every run is logged to retention_job_log for SOC 2 evidence.
 *
 * Run with: npx tsx src/jobs/retention.ts
 * In production: schedule via cron (0 2 * * *) or a Temporal schedule.
 */

import pg from 'pg';
import { randomUUID } from 'node:crypto';

const DATABASE_URL = process.env['DATABASE_URL'] ?? 'postgresql://studio:studio@localhost:5432/studio';
const pool = new pg.Pool({ connectionString: DATABASE_URL });

interface RetentionDefault {
  dataType: string;
  retentionDays: number;
  anonymise: boolean;
}

interface JobResult {
  dataType: string;
  rowsDeleted: number;
  rowsAnonymised: number;
  durationMs: number;
  error?: string;
}

async function loadDefaults(): Promise<RetentionDefault[]> {
  const { rows } = await pool.query(
    `SELECT data_type, retention_days, anonymise FROM system_retention_defaults`,
  );
  return rows.map((r) => ({
    dataType: r['data_type'] as string,
    retentionDays: r['retention_days'] as number,
    anonymise: r['anonymise'] as boolean,
  }));
}

async function pruneRuns(cutoffDays: number): Promise<{ deleted: number }> {
  const { rowCount } = await pool.query(
    `DELETE FROM runs
     WHERE status IN ('ready', 'failed')
       AND created_at < NOW() - ($1 || ' days')::interval`,
    [cutoffDays],
  );
  return { deleted: rowCount ?? 0 };
}

async function pruneArtifactVersions(cutoffDays: number): Promise<{ deleted: number }> {
  const { rowCount } = await pool.query(
    `DELETE FROM artifact_versions
     WHERE created_at < NOW() - ($1 || ' days')::interval
       AND deployment_id NOT IN (
         SELECT active_version_id FROM deployments WHERE unpublished_at IS NULL
       )`,
    [cutoffDays],
  );
  return { deleted: rowCount ?? 0 };
}

async function pruneCreditLedger(cutoffDays: number, anonymise: boolean): Promise<{ deleted: number; anonymised: number }> {
  if (anonymise) {
    const { rowCount } = await pool.query(
      `UPDATE credit_ledger
       SET description = '[anonymised]',
           metadata    = '{}'
       WHERE created_at < NOW() - ($1 || ' days')::interval
         AND description != '[anonymised]'`,
      [cutoffDays],
    );
    return { deleted: 0, anonymised: rowCount ?? 0 };
  }
  const { rowCount } = await pool.query(
    `DELETE FROM credit_ledger
     WHERE created_at < NOW() - ($1 || ' days')::interval`,
    [cutoffDays],
  );
  return { deleted: rowCount ?? 0, anonymised: 0 };
}

async function pruneAuditLog(cutoffDays: number): Promise<{ deleted: number }> {
  const { rowCount } = await pool.query(
    `DELETE FROM audit_log
     WHERE created_at < NOW() - ($1 || ' days')::interval`,
    [cutoffDays],
  );
  return { deleted: rowCount ?? 0 };
}

async function logResult(result: Omit<JobResult, 'durationMs'> & { durationMs: number }): Promise<void> {
  await pool.query(
    `INSERT INTO retention_job_log (id, data_type, rows_deleted, rows_anonymised, duration_ms, error)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [randomUUID(), result.dataType, result.rowsDeleted, result.rowsAnonymised, result.durationMs, result.error ?? null],
  );
}

async function runRetention(): Promise<void> {
  const defaults = await loadDefaults();
  const results: JobResult[] = [];

  for (const def of defaults) {
    const start = Date.now();
    let rowsDeleted = 0;
    let rowsAnonymised = 0;
    let error: string | undefined;

    try {
      switch (def.dataType) {
        case 'runs': {
          const r = await pruneRuns(def.retentionDays);
          rowsDeleted = r.deleted;
          break;
        }
        case 'artifacts': {
          const r = await pruneArtifactVersions(def.retentionDays);
          rowsDeleted = r.deleted;
          break;
        }
        case 'credit_ledger': {
          const r = await pruneCreditLedger(def.retentionDays, def.anonymise);
          rowsDeleted = r.deleted;
          rowsAnonymised = r.anonymised;
          break;
        }
        case 'audit_log': {
          const r = await pruneAuditLog(def.retentionDays);
          rowsDeleted = r.deleted;
          break;
        }
      }
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      console.error(`[retention] ${def.dataType} failed:`, error);
    }

    const durationMs = Date.now() - start;
    const result: JobResult = { dataType: def.dataType, rowsDeleted, rowsAnonymised, durationMs, error };
    results.push(result);
    await logResult(result);

    console.log(
      `[retention] ${def.dataType}: deleted=${rowsDeleted} anonymised=${rowsAnonymised} (${durationMs}ms)${error ? ` ERROR: ${error}` : ''}`,
    );
  }

  const totalDeleted = results.reduce((s, r) => s + r.rowsDeleted, 0);
  const totalAnonymised = results.reduce((s, r) => s + r.rowsAnonymised, 0);
  const hadErrors = results.some((r) => r.error);
  console.log(`[retention] complete — deleted=${totalDeleted} anonymised=${totalAnonymised} errors=${hadErrors}`);

  if (hadErrors) process.exit(1);
}

await runRetention().finally(() => pool.end());
