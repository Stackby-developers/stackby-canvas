import type { Redis } from 'ioredis';

export interface StreamEntry {
  id: string;
  type: string;
  runId: string;
  ts: number;
  data: unknown;
}

export async function readEvents(
  redis: Redis,
  runId: string,
  lastId = '0',
  blockMs = 0,
  count = 100,
): Promise<StreamEntry[]> {
  const key = `run:events:${runId}`;
  let results: unknown;

  if (blockMs > 0) {
    results = await (redis as Redis & { xread(...a: unknown[]): Promise<unknown> })
      .xread('BLOCK', blockMs, 'COUNT', count, 'STREAMS', key, lastId);
  } else {
    results = await redis.xread('COUNT', count, 'STREAMS', key, lastId);
  }

  if (!results) return [];

  const streams = results as Array<[string, Array<[string, string[]]>]>;
  return streams.flatMap(([, entries]) =>
    entries.map(([id, fields]) => {
      const obj: Record<string, string> = {};
      for (let i = 0; i < fields.length; i += 2) {
        obj[fields[i]!] = fields[i + 1]!;
      }
      return {
        id,
        type: obj['type'] ?? '',
        runId: obj['runId'] ?? runId,
        ts: Number(obj['ts'] ?? 0),
        data: obj['data'] ? JSON.parse(obj['data']) : {},
      };
    }),
  );
}
