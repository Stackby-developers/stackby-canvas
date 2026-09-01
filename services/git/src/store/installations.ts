import type { Pool } from 'pg';
import type { GitProvider } from '../providers/types.js';
import { encryptToken, decryptToken } from '../crypto/envelope.js';
import { randomUUID } from 'node:crypto';

export interface Installation {
  id: string;
  provider: GitProvider;
  installationId: string;
  workspaceId: string;
  installedByUserId: string;
  createdAt: Date;
}

export class InstallationStore {
  constructor(
    private readonly pool: Pool,
    private readonly encryptionKey: string,
  ) {}

  async save(input: {
    provider: GitProvider;
    installationId: string;
    accessToken: string;
    workspaceId: string;
    installedByUserId: string;
  }): Promise<Installation> {
    const id = randomUUID();
    const enc = encryptToken(input.accessToken, this.encryptionKey);
    await this.pool.query(
      `INSERT INTO git_installations
       (id, provider, installation_id, workspace_id, installed_by, token_ciphertext, token_iv, token_tag, token_salt, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
       ON CONFLICT (workspace_id, provider) DO UPDATE
       SET token_ciphertext=$6, token_iv=$7, token_tag=$8, token_salt=$9`,
      [id, input.provider, input.installationId, input.workspaceId, input.installedByUserId,
       enc.ciphertext, enc.iv, enc.tag, enc.salt],
    );
    return { id, provider: input.provider, installationId: input.installationId, workspaceId: input.workspaceId, installedByUserId: input.installedByUserId, createdAt: new Date() };
  }

  async getToken(workspaceId: string, provider: GitProvider): Promise<string | null> {
    const { rows } = await this.pool.query(
      `SELECT token_ciphertext, token_iv, token_tag, token_salt FROM git_installations WHERE workspace_id=$1 AND provider=$2`,
      [workspaceId, provider],
    );
    if (!rows[0]) return null;
    const r = rows[0];
    return decryptToken({
      ciphertext: r['token_ciphertext'] as string,
      iv: r['token_iv'] as string,
      tag: r['token_tag'] as string,
      salt: r['token_salt'] as string,
    }, this.encryptionKey);
  }
}
