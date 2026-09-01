import type { Pool } from 'pg';
import type Redis from 'ioredis';
import { DeploymentStore } from './store.js';

export async function rollbackDeployment(
  deploymentId: string,
  targetVersionNumber: number,
  byUserId: string,
  pool: Pool,
  redis: Redis,
): Promise<{ versionId: string; versionNumber: number }> {
  const store = new DeploymentStore(pool);
  const deployment = await store.getById(deploymentId);
  if (!deployment) {
    throw Object.assign(new Error('Deployment not found'), { httpStatus: 404 });
  }

  const versions = await store.listVersions(deploymentId);
  const target = versions.find((v) => v.versionNumber === targetVersionNumber);
  if (!target) {
    throw Object.assign(new Error(`Version ${targetVersionNumber} not found`), { httpStatus: 404 });
  }

  await store.setActiveVersion(deploymentId, target.id);
  await redis.del(`slug:${deployment.slug}`);

  return { versionId: target.id, versionNumber: target.versionNumber };
}
