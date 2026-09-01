import type { Pool } from 'pg';
import type { DesignTokens } from '@stackby/schema-types';
import { randomUUID } from 'node:crypto';

export interface DesignSystemRecord {
  id: string;
  workspaceId: string;
  name: string;
  brandUrl: string | undefined;
  notes: string | undefined;
  tokens: DesignTokens | undefined;
  version: number;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
}

export class DesignSystemStore {
  constructor(private readonly pool: Pool) {}

  async create(input: {
    workspaceId: string;
    name: string;
    brandUrl: string | undefined;
    notes: string | undefined;
    createdByUserId: string;
  }): Promise<DesignSystemRecord> {
    const id = randomUUID();
    await this.pool.query(
      `INSERT INTO design_systems (id, workspace_id, name, brand_url, notes, version, created_by, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,1,$6,NOW(),NOW())`,
      [id, input.workspaceId, input.name, input.brandUrl ?? null, input.notes ?? null, input.createdByUserId],
    );
    return (await this.getById(id)) as DesignSystemRecord;
  }

  async getById(id: string): Promise<DesignSystemRecord | null> {
    const { rows } = await this.pool.query(`SELECT * FROM design_systems WHERE id=$1`, [id]);
    return rows[0] ? this.toRecord(rows[0]) : null;
  }

  async listByWorkspace(workspaceId: string): Promise<DesignSystemRecord[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM design_systems WHERE workspace_id=$1 ORDER BY updated_at DESC`,
      [workspaceId],
    );
    return rows.map((r) => this.toRecord(r));
  }

  async updateTokens(id: string, tokens: DesignTokens): Promise<void> {
    await this.pool.query(
      `UPDATE design_systems SET tokens=$1, version=version+1, updated_at=NOW() WHERE id=$2`,
      [JSON.stringify(tokens), id],
    );
  }

  async listVersions(id: string): Promise<number[]> {
    const { rows } = await this.pool.query(
      `SELECT version FROM design_system_versions WHERE design_system_id=$1 ORDER BY version DESC`,
      [id],
    );
    return rows.map((r) => r['version'] as number);
  }

  async getDependentProjects(id: string): Promise<Array<{ projectId: string; projectName: string }>> {
    const { rows } = await this.pool.query(
      `SELECT p.id as project_id, p.name FROM projects p WHERE p.design_system_id=$1`,
      [id],
    );
    return rows.map((r) => ({ projectId: r['project_id'] as string, projectName: r['name'] as string }));
  }

  private toRecord(r: Record<string, unknown>): DesignSystemRecord {
    return {
      id: r['id'] as string,
      workspaceId: r['workspace_id'] as string,
      name: r['name'] as string,
      brandUrl: (r['brand_url'] as string | null) ?? undefined,
      notes: (r['notes'] as string | null) ?? undefined,
      tokens: r['tokens'] ? JSON.parse(r['tokens'] as string) as DesignTokens : undefined,
      version: r['version'] as number,
      createdByUserId: r['created_by'] as string,
      createdAt: new Date(r['created_at'] as string),
      updatedAt: new Date(r['updated_at'] as string),
    };
  }
}
