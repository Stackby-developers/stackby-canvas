import type { Redis } from 'ioredis';
import type { ExtractionProgress } from '../extractor/types.js';

const STREAM_TTL = 86400 * 3;

export function streamKey(designSystemId: string): string {
  return `design:events:${designSystemId}`;
}

export async function emitProgress(redis: Redis, progress: ExtractionProgress): Promise<void> {
  const key = streamKey(progress.designSystemId);
  await redis.xadd(key, '*',
    'jobId', progress.jobId,
    'step', progress.step,
    'pagesVisited', String(progress.pagesVisited),
    'pagesTotal', String(progress.pagesTotal),
    'message', progress.message,
    'ts', String(progress.ts),
  );
  await redis.expire(key, STREAM_TTL);
}

export async function readProgress(
  redis: Redis,
  designSystemId: string,
  lastId = '0',
): Promise<Array<{ id: string; progress: ExtractionProgress }>> {
  const results = await redis.xread('COUNT', 100, 'STREAMS', streamKey(designSystemId), lastId);
  if (!results) return [];
  const streams = results as Array<[string, Array<[string, string[]]>]>;
  return streams.flatMap(([, entries]) =>
    entries.map(([id, fields]) => {
      const obj: Record<string, string> = {};
      for (let i = 0; i < fields.length; i += 2) obj[fields[i]!] = fields[i + 1]!;
      return {
        id,
        progress: {
          jobId: obj['jobId'] ?? '',
          designSystemId,
          step: (obj['step'] ?? 'starting') as ExtractionProgress['step'],
          pagesVisited: parseInt(obj['pagesVisited'] ?? '0', 10),
          pagesTotal: parseInt(obj['pagesTotal'] ?? '0', 10),
          message: obj['message'] ?? '',
          ts: parseInt(obj['ts'] ?? '0', 10),
        },
      };
    }),
  );
}
