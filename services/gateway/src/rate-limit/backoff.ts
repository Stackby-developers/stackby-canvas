import type { Redis } from 'ioredis';

const COOLDOWN_KEY_PREFIX = 'dg:cooldown:';

// Tracks per-stack 30s cooldowns after receiving a 429 from Stackby.
// During cooldown, fetchAllRows breaks its loop and callers serve stale data.
// A viewer MUST NOT receive a 429 error — stale-while-revalidate instead.
export class CooldownManager {
  constructor(
    private readonly redis: Redis,
    private readonly cooldownMs: number,
  ) {}

  private key(stackId: string): string {
    return `${COOLDOWN_KEY_PREFIX}${stackId}`;
  }

  async isCoolingDown(stackId: string): Promise<boolean> {
    const ttl = await this.redis.pttl(this.key(stackId));
    return ttl > 0;
  }

  async setCooldown(stackId: string): Promise<void> {
    await this.redis.set(this.key(stackId), '1', 'PX', this.cooldownMs);
  }

  async remainingMs(stackId: string): Promise<number> {
    const ttl = await this.redis.pttl(this.key(stackId));
    return Math.max(0, ttl);
  }
}

export function isRateLimitError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const typed = err as Error & { statusCode?: number };
  return typed.statusCode === 429 || err.message === 'RATE_LIMITED';
}
