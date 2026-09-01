import { createHash } from 'node:crypto';
import type { Pool } from 'pg';

export interface AuditEntry {
  id: string;
  workspaceId: string;
  actorId: string;
  action: string;
  resourceType: string;
  resourceId?: string | undefined;
  metadata: Record<string, unknown>;
  createdAt: Date;
  chainHash: string;
}

export type AuditFilter = {
  workspaceId?: string;
  actorId?: string;
  action?: string;
  resourceType?: string;
  dateFrom?: string;
  dateTo?: string;
};

const CHAIN_GENESIS = '0000000000000000000000000000000000000000000000000000000000000000';

function canonicalJson(entry: Omit<AuditEntry, 'chainHash'>): string {
  return JSON.stringify({
    id: entry.id,
    workspaceId: entry.workspaceId,
    actorId: entry.actorId,
    action: entry.action,
    resourceType: entry.resourceType,
    resourceId: entry.resourceId ?? null,
    metadata: entry.metadata,
    createdAt: entry.createdAt.toISOString(),
  });
}

export function computeChainHash(previousHash: string, entry: Omit<AuditEntry, 'chainHash'>): string {
  return createHash('sha256')
    .update(previousHash)
    .update(canonicalJson(entry))
    .digest('hex');
}

export class AuditLog {
  constructor(private readonly pool: Pool) {}

  async append(entry: Omit<AuditEntry, 'chainHash'>): Promise<AuditEntry> {
    const { rows } = await this.pool.query(
      `SELECT chain_hash FROM audit_log WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT 1`,
      [entry.workspaceId],
    );
    const previousHash = rows[0]?.['chain_hash'] as string ?? CHAIN_GENESIS;
    const chainHash = computeChainHash(previousHash, entry);

    await this.pool.query(
      `INSERT INTO audit_log (id, workspace_id, actor_id, action, resource_type, resource_id, metadata, chain_hash, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [entry.id, entry.workspaceId, entry.actorId, entry.action, entry.resourceType,
       entry.resourceId ?? null, JSON.stringify(entry.metadata), chainHash, entry.createdAt],
    );

    return { ...entry, chainHash };
  }

  async query(filter: AuditFilter, limit = 100, offset = 0): Promise<AuditEntry[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    if (filter.workspaceId) { conditions.push(`workspace_id=$${i++}`); params.push(filter.workspaceId); }
    if (filter.actorId) { conditions.push(`actor_id=$${i++}`); params.push(filter.actorId); }
    if (filter.action) { conditions.push(`action=$${i++}`); params.push(filter.action); }
    if (filter.resourceType) { conditions.push(`resource_type=$${i++}`); params.push(filter.resourceType); }
    if (filter.dateFrom) { conditions.push(`created_at >= $${i++}`); params.push(filter.dateFrom); }
    if (filter.dateTo) { conditions.push(`created_at <= $${i++}`); params.push(filter.dateTo); }

    params.push(limit, offset);
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await this.pool.query(
      `SELECT * FROM audit_log ${where} ORDER BY created_at DESC LIMIT $${i} OFFSET $${i + 1}`,
      params,
    );

    return rows.map((r) => ({
      id: r['id'] as string,
      workspaceId: r['workspace_id'] as string,
      actorId: r['actor_id'] as string,
      action: r['action'] as string,
      resourceType: r['resource_type'] as string,
      resourceId: r['resource_id'] as string | undefined,
      metadata: r['metadata'] as Record<string, unknown>,
      createdAt: new Date(r['created_at'] as string),
      chainHash: r['chain_hash'] as string,
    }));
  }

  exportCsv(entries: AuditEntry[]): string {
    const header = 'id,workspaceId,actorId,action,resourceType,resourceId,createdAt,chainHash';
    const rows = entries.map((e) =>
      [e.id, e.workspaceId, e.actorId, e.action, e.resourceType, e.resourceId ?? '', e.createdAt.toISOString(), e.chainHash]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','),
    );
    return [header, ...rows].join('\n');
  }

  exportJson(entries: AuditEntry[]): string {
    return entries.map((e) => JSON.stringify(e)).join('\n');
  }

  async verifyChain(workspaceId: string): Promise<{ valid: boolean; brokenAt?: string }> {
    const { rows } = await this.pool.query(
      `SELECT * FROM audit_log WHERE workspace_id=$1 ORDER BY created_at ASC`,
      [workspaceId],
    );

    let previousHash = CHAIN_GENESIS;
    for (const row of rows) {
      const entry: Omit<AuditEntry, 'chainHash'> = {
        id: row['id'] as string,
        workspaceId: row['workspace_id'] as string,
        actorId: row['actor_id'] as string,
        action: row['action'] as string,
        resourceType: row['resource_type'] as string,
        resourceId: row['resource_id'] as string | undefined,
        metadata: row['metadata'] as Record<string, unknown>,
        createdAt: new Date(row['created_at'] as string),
      };
      const expected = computeChainHash(previousHash, entry);
      if (expected !== (row['chain_hash'] as string)) {
        return { valid: false, brokenAt: entry.id };
      }
      previousHash = expected;
    }
    return { valid: true };
  }
}
