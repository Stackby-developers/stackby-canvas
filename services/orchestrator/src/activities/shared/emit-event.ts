import type { Redis } from 'ioredis';
import type { RunEvent } from '@stackby/schema-types';

const STREAM_TTL = 86400 * 7;

export async function emitEvent(redis: Redis, streamKey: string, event: RunEvent): Promise<string> {
  const id = await redis.xadd(
    streamKey, '*',
    'type', event.type,
    'runId', event.runId,
    'ts', String(event.ts),
    'data', JSON.stringify((event as unknown as { data: unknown }).data),
  );
  await redis.expire(streamKey, STREAM_TTL);
  return id ?? '';
}

export function runStreamKey(runId: string): string {
  return `run:events:${runId}`;
}
