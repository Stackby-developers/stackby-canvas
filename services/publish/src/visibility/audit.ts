import type { Pool } from 'pg';
import type { VisibilityMode, PublishConfirmation } from '../deployment/types.js';
import { randomUUID } from 'node:crypto';

export async function auditPublish(
  pool: Pool,
  entry: {
    workspaceId: string;
    deploymentId: string;
    actorId: string;
    visibility: VisibilityMode;
    confirmation: PublishConfirmation;
  },
): Promise<void> {
  await pool.query(
    `INSERT INTO audit_log (id, workspace_id, actor_id, action, resource_type, resource_id, metadata, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
    [
      randomUUID(),
      entry.workspaceId,
      entry.actorId,
      `publish.${entry.visibility}`,
      'deployment',
      entry.deploymentId,
      JSON.stringify({
        visibility: entry.visibility,
        tablesBecomingReadable: entry.confirmation.tablesBecomingReadable,
        columnsBecomingReadable: entry.confirmation.columnsBecomingReadable,
      }),
    ],
  );
}
