import type { Pool } from 'pg';
import type Redis from 'ioredis';
import type { Deployment } from '../deployment/types.js';
import { DeploymentStore } from '../deployment/store.js';

const CACHE_TTL = 60;

export async function resolveSlug(
  slug: string,
  pool: Pool,
  redis: Redis,
): Promise<Deployment | null> {
  const cached = await redis.get(`slug:${slug}`);
  if (cached) {
    const parsed = JSON.parse(cached) as Deployment & { publishedAt: string; unpublishedAt?: string };
    return {
      ...parsed,
      publishedAt: new Date(parsed.publishedAt),
      unpublishedAt: parsed.unpublishedAt ? new Date(parsed.unpublishedAt) : undefined,
    };
  }

  const store = new DeploymentStore(pool);
  const deployment = await store.getBySlug(slug);
  if (deployment) {
    await redis.set(`slug:${slug}`, JSON.stringify(deployment), 'EX', CACHE_TTL);
  }
  return deployment;
}
