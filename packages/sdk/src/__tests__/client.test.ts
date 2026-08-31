import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StackbyStudioClient } from '../client.js';
import type { StackbyConfig } from '../internal/context.js';

const config: StackbyConfig = {
  gatewayUrl: 'http://gateway.test',
  authToken: 'tok_test',
  stackId: 'stk_test',
  artifactId: 'art_test',
};

const client = new StackbyStudioClient(config);

function mockFetch(response: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: async () => response,
    text: async () => JSON.stringify(response),
  });
}

beforeEach(() => {
  vi.stubGlobal('crypto', { randomUUID: () => 'idem-key-test' });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('StackbyStudioClient', () => {
  describe('getRecords', () => {
    it('calls /dg/v1/read with correct body', async () => {
      const fetchMock = mockFetch({
        data: [{ id: 'r1', createdTime: '2026-01-01', fields: { Name: 'Test' } }],
        meta: { rowIds: ['r1'], columnIds: [], cacheAgeMs: 0, truncated: false, upstreamCalls: 1 },
      });
      vi.stubGlobal('fetch', fetchMock);

      const rows = await client.getRecords('tbl_tasks');

      expect(fetchMock).toHaveBeenCalledOnce();
      const [url, init] = fetchMock.mock.calls[0]!;
      expect(url).toBe('http://gateway.test/dg/v1/read');
      expect(url).not.toContain('stackby.com');
      const body = JSON.parse(init.body as string);
      expect(body.tableId).toBe('tbl_tasks');
      expect(body.stackId).toBe('stk_test');
      expect(rows).toHaveLength(1);
    });

    it('does not call stackby.com directly', async () => {
      const fetchMock = mockFetch({ data: [], meta: { rowIds: [], columnIds: [], cacheAgeMs: 0, truncated: false, upstreamCalls: 0 } });
      vi.stubGlobal('fetch', fetchMock);
      await client.getRecords('tbl_tasks');
      const [url] = fetchMock.mock.calls[0]!;
      expect(url as string).not.toContain('stackby.com');
    });
  });

  describe('createRecord', () => {
    it('calls /dg/v1/mutate with op=create and Idempotency-Key header', async () => {
      const fetchMock = mockFetch({ results: [{ id: 'new_r1' }] });
      vi.stubGlobal('fetch', fetchMock);

      await client.createRecord('tbl_tasks', { Name: 'New task' });

      const [url, init] = fetchMock.mock.calls[0]!;
      expect(url).toBe('http://gateway.test/dg/v1/mutate');
      const headers = init.headers as Record<string, string>;
      expect(headers['Idempotency-Key']).toBeDefined();
      const body = JSON.parse(init.body as string);
      expect(body.op).toBe('create');
      expect(body.records[0].fields).toEqual({ Name: 'New task' });
    });
  });

  describe('updateRecord', () => {
    it('calls /dg/v1/mutate with op=update', async () => {
      const fetchMock = mockFetch({ results: [{ id: 'r1' }] });
      vi.stubGlobal('fetch', fetchMock);

      await client.updateRecord('tbl_tasks', 'r1', { Name: 'Updated' });

      const [, init] = fetchMock.mock.calls[0]!;
      const body = JSON.parse(init.body as string);
      expect(body.op).toBe('update');
      expect(body.records[0].id).toBe('r1');
      expect(body.records[0].fields).toEqual({ Name: 'Updated' });
    });
  });

  describe('deleteRecord', () => {
    it('calls /dg/v1/mutate with op=delete', async () => {
      const fetchMock = mockFetch({ results: [{ id: 'r1' }] });
      vi.stubGlobal('fetch', fetchMock);

      await client.deleteRecord('tbl_tasks', 'r1');

      const [, init] = fetchMock.mock.calls[0]!;
      const body = JSON.parse(init.body as string);
      expect(body.op).toBe('delete');
      expect(body.records[0].id).toBe('r1');
    });
  });

  it('all methods use gateway URL, not stackby.com', async () => {
    const urls: string[] = [];
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string) => {
      urls.push(url);
      return { ok: true, status: 200, json: async () => ({ data: [], meta: {}, results: [] }) };
    }));

    await client.getRecords('t1').catch(() => {});
    await client.createRecord('t1', {}).catch(() => {});
    await client.updateRecord('t1', 'r1', {}).catch(() => {});
    await client.deleteRecord('t1', 'r1').catch(() => {});
    await client.me().catch(() => {});

    for (const url of urls) {
      expect(url).not.toContain('stackby.com');
    }
  });
});
