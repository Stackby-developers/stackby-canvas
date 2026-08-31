import type { Redis } from 'ioredis';

// Atomic token bucket via Lua — ensures correctness under concurrent writers.
// Returns [allowed: 0|1, waitMs: number]
const CONSUME_SCRIPT = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local rate = tonumber(ARGV[2])
local burst = tonumber(ARGV[3])
local cost = tonumber(ARGV[4])
local tokens = burst
local last = now
local data = redis.call('HMGET', key, 'tokens', 'last')
if data[1] then
  tokens = tonumber(data[1])
  last = tonumber(data[2])
end
local elapsed = (now - last) / 1000.0
tokens = math.min(burst, tokens + elapsed * rate)
if tokens >= cost then
  tokens = tokens - cost
  redis.call('HMSET', key, 'tokens', tokens, 'last', now)
  redis.call('PEXPIRE', key, 30000)
  return {1, 0}
else
  local wait = math.ceil((cost - tokens) / rate * 1000)
  redis.call('HMSET', key, 'tokens', tokens, 'last', now)
  redis.call('PEXPIRE', key, 30000)
  return {0, wait}
end
`;

export interface TokenBucketResult {
  allowed: boolean;
  waitMs: number;
}

export class PerStackTokenBucket {
  constructor(
    public readonly redis: Redis,
    private readonly rps: number,
    private readonly burst: number,
  ) {}

  async consume(stackId: string, cost = 1): Promise<TokenBucketResult> {
    const key = `tb:${stackId}`;
    const result = (await this.redis.eval(
      CONSUME_SCRIPT,
      1,
      key,
      String(Date.now()),
      String(this.rps),
      String(this.burst),
      String(cost),
    )) as [number, number];
    return { allowed: result[0] === 1, waitMs: result[1] ?? 0 };
  }

  async waitForToken(stackId: string): Promise<void> {
    const MAX_WAIT = 5_000;
    let waited = 0;
    while (waited < MAX_WAIT) {
      const { allowed, waitMs } = await this.consume(stackId);
      if (allowed) return;
      const delay = Math.min(waitMs, MAX_WAIT - waited);
      await new Promise<void>((r) => setTimeout(r, delay));
      waited += delay;
    }
    throw Object.assign(new Error('Token bucket exhausted'), {
      code: 'RATE_LIMITED',
      statusCode: 503,
    });
  }
}
