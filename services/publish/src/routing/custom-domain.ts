import type { Pool } from 'pg';
import type Redis from 'ioredis';
import type { Deployment } from '../deployment/types.js';
import { DeploymentStore } from '../deployment/store.js';

export async function resolveCustomDomain(
  domain: string,
  pool: Pool,
  redis: Redis,
): Promise<Deployment | null> {
  const cached = await redis.get(`domain:${domain}`);
  if (cached) return JSON.parse(cached) as Deployment;

  const store = new DeploymentStore(pool);
  const deployment = await store.getByCustomDomain(domain);
  if (deployment) {
    await redis.set(`domain:${domain}`, JSON.stringify(deployment), 'EX', 300);
  }
  return deployment;
}
