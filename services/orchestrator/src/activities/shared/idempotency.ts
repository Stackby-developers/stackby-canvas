import type { Redis } from 'ioredis';

const TTL_SECONDS = 86400;

export async function withIdempotency<T>(redis: Redis, key: string, fn: () => Promise<T>): Promise<T> {
  const cached = await redis.get(`idem:act:${key}`);
  if (cached) return JSON.parse(cached) as T;
  const result = await fn();
  await redis.set(`idem:act:${key}`, JSON.stringify(result), 'EX', TTL_SECONDS);
  return result;
}
