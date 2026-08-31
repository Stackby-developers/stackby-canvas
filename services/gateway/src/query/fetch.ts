import type { StackbyClient, StackbyRow } from '../stackby-client.js';
import type { PerStackTokenBucket } from '../rate-limit/token-bucket.js';
import type { CooldownManager } from '../rate-limit/backoff.js';
import { isRateLimitError } from '../rate-limit/backoff.js';

export interface FetchResult {
  rows: StackbyRow[];
  truncated: boolean;
  upstreamCalls: number;
}

export interface FetchOptions {
  tableId: string;
  viewId?: string | undefined;
  fields?: string[] | undefined;
  rowCeiling: number;
}

const PAGE_SIZE = 100;

export async function fetchAllRows(
  client: StackbyClient,
  bucket: PerStackTokenBucket,
  cooldown: CooldownManager,
  stackId: string,
  opts: FetchOptions,
): Promise<FetchResult> {
  const rows: StackbyRow[] = [];
  let offset: string | undefined;
  let upstreamCalls = 0;

  while (rows.length < opts.rowCeiling) {
    if (await cooldown.isCoolingDown(stackId)) break;

    await bucket.waitForToken(stackId);

    try {
      const res = await client.getRows(stackId, opts.tableId, {
        ...(offset !== undefined ? { offset } : {}),
        limit: Math.min(PAGE_SIZE, opts.rowCeiling - rows.length),
        ...(opts.fields !== undefined ? { fields: opts.fields } : {}),
        ...(opts.viewId !== undefined ? { viewId: opts.viewId } : {}),
      });
      upstreamCalls++;
      rows.push(...res.records);
      offset = res.offset;
      if (!offset) break;
    } catch (err) {
      if (isRateLimitError(err)) {
        await cooldown.setCooldown(stackId);
        break; // caller serves stale — viewer never sees the 429
      }
      throw err;
    }
  }

  return { rows, truncated: rows.length >= opts.rowCeiling, upstreamCalls };
}
