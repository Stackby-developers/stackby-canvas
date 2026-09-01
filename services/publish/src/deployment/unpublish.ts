import type { Pool } from 'pg';
import type Redis from 'ioredis';
import { DeploymentStore } from './store.js';

export async function unpublishDeployment(
  deploymentId: string,
  byUserId: string,
  pool: Pool,
  redis: Redis,
): Promise<void> {
  const store = new DeploymentStore(pool);
  const deployment = await store.getById(deploymentId);
  if (!deployment) {
    throw Object.assign(new Error('Deployment not found'), { httpStatus: 404 });
  }

  await store.unpublish(deploymentId, byUserId);
  await redis.del(`slug:${deployment.slug}`);
  if (deployment.customDomain) {
    await redis.del(`domain:${deployment.customDomain}`);
  }
  // Tombstone so in-flight requests get 410
  await redis.set(`unpublished:${deploymentId}`, '1', 'EX', 300);
}
