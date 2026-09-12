import type { Pool } from 'pg';
import { dispatchEvent } from './dispatcher.js';

export async function dispatchArtifactPublished(
  pool: Pool,
  workspaceId: string,
  deploymentId: string,
  slug: string,
  visibility: string,
  projectId: string,
): Promise<void> {
  await dispatchEvent(pool, 'artifact.published', workspaceId, {
    deploymentId,
    slug,
    visibility,
    projectId,
    publishedAt: new Date().toISOString(),
  });
}
