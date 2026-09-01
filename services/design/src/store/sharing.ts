import type { Pool } from 'pg';
import { randomUUID } from 'node:crypto';

export type ShareRole = 'view' | 'edit';

export interface Share {
  id: string;
  designSystemId: string;
  grantedToUserId: string | undefined;
  grantedToWorkspaceId: string | undefined;
  role: ShareRole;
  grantedByUserId: string;
  createdAt: Date;
}

export class SharingStore {
  constructor(private readonly pool: Pool) {}

  async grant(input: {
    designSystemId: string;
    grantedByUserId: string;
    grantedToUserId: string | undefined;
    grantedToWorkspaceId: string | undefined;
    role: ShareRole;
  }): Promise<Share> {
    const id = randomUUID();
    await this.pool.query(
      `INSERT INTO design_system_shares
       (id, design_system_id, granted_to_user_id, granted_to_workspace_id, role, granted_by, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW())
       ON CONFLICT (design_system_id, granted_to_user_id) DO UPDATE SET role = EXCLUDED.role`,
      [
        id, input.designSystemId,
        input.grantedToUserId ?? null,
        input.grantedToWorkspaceId ?? null,
        input.role, input.grantedByUserId,
      ],
    );
    return (await this.getById(id)) as Share;
  }

  async revoke(designSystemId: string, grantedToUserId: string): Promise<void> {
    await this.pool.query(
      `DELETE FROM design_system_shares WHERE design_system_id=$1 AND granted_to_user_id=$2`,
      [designSystemId, grantedToUserId],
    );
  }

  async getSharedWithUser(
    userId: string,
    workspaceId: string,
  ): Promise<Array<{ designSystemId: string; role: ShareRole }>> {
    const { rows } = await this.pool.query(
      `SELECT design_system_id, role FROM design_system_shares
       WHERE (granted_to_user_id=$1 OR granted_to_workspace_id=$2)`,
      [userId, workspaceId],
    );
    return rows.map((r) => ({
      designSystemId: r['design_system_id'] as string,
      role: r['role'] as ShareRole,
    }));
  }

  async hasAccess(
    designSystemId: string,
    userId: string,
    workspaceId: string,
  ): Promise<ShareRole | null> {
    const { rows } = await this.pool.query(
      `SELECT role FROM design_system_shares
       WHERE design_system_id=$1 AND (granted_to_user_id=$2 OR granted_to_workspace_id=$3)
       ORDER BY role DESC LIMIT 1`,
      [designSystemId, userId, workspaceId],
    );
    return (rows[0]?.['role'] as ShareRole) ?? null;
  }

  private async getById(id: string): Promise<Share | null> {
    const { rows } = await this.pool.query(
      `SELECT * FROM design_system_shares WHERE id=$1`,
      [id],
    );
    if (!rows[0]) return null;
    const r = rows[0];
    return {
      id: r['id'] as string,
      designSystemId: r['design_system_id'] as string,
      grantedToUserId: (r['granted_to_user_id'] as string | null) ?? undefined,
      grantedToWorkspaceId: (r['granted_to_workspace_id'] as string | null) ?? undefined,
      role: r['role'] as ShareRole,
      grantedByUserId: r['granted_by'] as string,
      createdAt: new Date(r['created_at'] as string),
    };
  }
}
