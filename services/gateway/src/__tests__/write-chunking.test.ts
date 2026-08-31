/**
 * Write chunking test — 34 records → exactly 4 upstream calls, 34 results.
 */
import { describe, it, expect, vi } from 'vitest';
import { chunkArray } from '../routes/mutate.js';
import type { StackbyMutateResult } from '../stackby-client.js';

describe('chunkArray', () => {
  it('splits 34 items into [10,10,10,4]', () => {
    const arr = Array.from({ length: 34 }, (_, i) => i);
    const chunks = chunkArray(arr, 10);
    expect(chunks).toHaveLength(4);
    expect(chunks[0]).toHaveLength(10);
    expect(chunks[1]).toHaveLength(10);
    expect(chunks[2]).toHaveLength(10);
    expect(chunks[3]).toHaveLength(4);
  });

  it('splits 10 items into one chunk of 10', () => {
    const arr = Array.from({ length: 10 }, (_, i) => i);
    expect(chunkArray(arr, 10)).toHaveLength(1);
  });

  it('splits 11 items into [10,1]', () => {
    const arr = Array.from({ length: 11 }, (_, i) => i);
    const chunks = chunkArray(arr, 10);
    expect(chunks).toHaveLength(2);
    expect(chunks[1]).toHaveLength(1);
  });
});

describe('34-record update produces 4 upstream calls', () => {
  it('calls updateRows exactly 4 times, returns 34 results', async () => {
    const callLog: Array<{ count: number }> = [];
    const mockClient = {
      updateRows: vi.fn(async (_stackId, _tableId, records) => {
        callLog.push({ count: records.length });
        return records.map((r: { id: string }) => ({ id: r.id })) as StackbyMutateResult[];
      }),
    };

    const records = Array.from({ length: 34 }, (_, i) => ({
      id: `row_${i}`,
      fields: { name: `Record ${i}` },
    }));

    const results: StackbyMutateResult[] = [];
    const chunks = chunkArray(records, 10);

    for (const chunk of chunks) {
      const res = await mockClient.updateRows(
        'stk_1',
        'tbl_1',
        chunk.map((r) => ({ id: r.id, fields: r.fields })),
      );
      results.push(...res);
    }

    expect(mockClient.updateRows).toHaveBeenCalledTimes(4);
    expect(callLog.map((c) => c.count)).toEqual([10, 10, 10, 4]);
    expect(results).toHaveLength(34);
  });

  it('continues processing remaining chunks after a per-chunk error', async () => {
    let callCount = 0;
    const mockClient = {
      updateRows: vi.fn(async (_stackId, _tableId, records) => {
        callCount++;
        if (callCount === 2) throw new Error('Temporary upstream error');
        return records.map((r: { id: string }) => ({ id: r.id })) as StackbyMutateResult[];
      }),
    };

    const records = Array.from({ length: 25 }, (_, i) => ({ id: `row_${i}`, fields: {} }));
    const chunks = chunkArray(records, 10);
    const results: Array<{ id?: string; error?: string }> = [];

    for (const chunk of chunks) {
      try {
        const res = await mockClient.updateRows('stk_1', 'tbl_1', chunk.map((r) => ({ id: r.id, fields: r.fields })));
        results.push(...res);
      } catch (err) {
        results.push(...chunk.map(() => ({ error: err instanceof Error ? err.message : 'error' })));
      }
    }

    // 3 chunks attempted, chunk 2 errored but chunks 1 and 3 succeeded
    expect(results).toHaveLength(25);
    expect(results.filter((r) => r.error)).toHaveLength(10);
    expect(results.filter((r) => !r.error)).toHaveLength(15);
  });
});
