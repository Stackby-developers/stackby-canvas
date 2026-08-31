import type { Redis } from 'ioredis';

const LOCK_TTL_MS = 8_000;
const POLL_INTERVAL_MS = 50;
const MAX_WAIT_MS = 7_000;

// Distributed coalescing lock: when N concurrent requests miss the cache for the same
// key, exactly 1 fetches upstream; the rest poll and read from cache once populated.
export async function withCoalescingLock<T>(
  redis: Redis,
  key: string,
  fetchFn: () => Promise<T>,
  waitFn: () => Promise<T | null>,
): Promise<T> {
  const lockKey = `${key}:lock`;
  const acquired = await redis.set(lockKey, '1', 'PX', LOCK_TTL_MS, 'NX');

  if (acquired === 'OK') {
    try {
      return await fetchFn();
    } finally {
      await redis.del(lockKey);
    }
  }

  // Not the lock holder — poll until the fetch completes
  const deadline = Date.now() + MAX_WAIT_MS;
  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);
    const result = await waitFn();
    if (result !== null) return result;
  }
  // Fallback: fetch independently (lock holder may have crashed)
  return fetchFn();
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
