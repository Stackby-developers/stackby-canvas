import type { Redis } from 'ioredis';

export interface CachedRowSet {
  rows: Array<{ id: string; createdTime: string; fields: Record<string, unknown> }>;
  cachedAt: number;
  truncated: boolean;
  upstreamCalls: number;
}

export class RowCache {
  constructor(
    private readonly redis: Redis,
    private readonly ttlSeconds: number,
    private readonly staleTtlSeconds: number,
  ) {}

  async get(key: string): Promise<{ value: CachedRowSet; ageMs: number } | null> {
    const raw = await this.redis.get(key);
    if (!raw) return null;
    const value = JSON.parse(raw) as CachedRowSet;
    return { value, ageMs: Date.now() - value.cachedAt };
  }

  async set(key: string, value: CachedRowSet): Promise<void> {
    await this.redis.set(key, JSON.stringify(value), 'EX', this.ttlSeconds);
  }

  async getStale(key: string): Promise<CachedRowSet | null> {
    const staleKey = `${key}:stale`;
    const raw = await this.redis.get(staleKey);
    return raw ? (JSON.parse(raw) as CachedRowSet) : null;
  }

  async promoteToStale(key: string, value: CachedRowSet): Promise<void> {
    await this.redis.set(`${key}:stale`, JSON.stringify(value), 'EX', this.staleTtlSeconds);
  }
}
