import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { createTestClient } from '../test-utils/create-test-client.js';
import { makeRows } from '../test-utils/fixtures.js';
import { useRecords } from '../hooks/use-records.js';
import { useRecord } from '../hooks/use-record.js';
import { useSearch } from '../hooks/use-search.js';
import { useStack } from '../hooks/use-stack.js';
import { useDeepLink } from '../hooks/use-deep-link.js';

function RecordsComponent({ tableId }: { tableId: string }) {
  const { data, isLoading, isEmpty, isPermissionDenied } = useRecords(tableId);
  if (isLoading) return <div>loading</div>;
  if (isPermissionDenied) return <div>denied</div>;
  if (isEmpty) return <div>empty</div>;
  return <ul>{data?.map((r) => <li key={r.id}>{r.id}</li>)}</ul>;
}

describe('useRecords', () => {
  it('renders rows from fixture', async () => {
    const rows = makeRows(3);
    const client = createTestClient({ Tasks: rows });
    render(
      <client.Provider>
        <RecordsComponent tableId="Tasks" />
      </client.Provider>,
    );
    await waitFor(() => expect(screen.queryByText('loading')).toBeNull());
    expect(screen.getByText('row_0001')).toBeDefined();
    expect(screen.getByText('row_0003')).toBeDefined();
  });

  it('shows empty state when fixture is empty array', async () => {
    const client = createTestClient({ Tasks: [] });
    render(
      <client.Provider>
        <RecordsComponent tableId="Tasks" />
      </client.Provider>,
    );
    await waitFor(() => expect(screen.queryByText('loading')).toBeNull());
    expect(screen.getByText('empty')).toBeDefined();
  });

  it('sets isPermissionDenied when gateway returns 403', async () => {
    const client = createTestClient({});
    // Mock fetch to return 403
    vi.stubGlobal('fetch', async () => ({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      json: async () => ({ error: 'Forbidden' }),
    }));

    function PermissionComponent() {
      const { isPermissionDenied, isLoading } = useRecords('Secret', { enabled: true });
      if (isLoading) return <div>loading</div>;
      return <div>{isPermissionDenied ? 'denied' : 'ok'}</div>;
    }

    render(
      <client.Provider>
        <PermissionComponent />
      </client.Provider>,
    );
    await waitFor(() => expect(screen.queryByText('loading')).toBeNull());
    expect(screen.getByText('denied')).toBeDefined();
    vi.unstubAllGlobals();
  });
});

describe('useRecord', () => {
  it('returns undefined/no-load when recordId is null', async () => {
    const client = createTestClient({});
    function Comp() {
      const { data, isLoading } = useRecord('Tasks', null);
      if (isLoading) return <div>loading</div>;
      return <div>{data == null ? 'null-record' : 'has-record'}</div>;
    }
    render(<client.Provider><Comp /></client.Provider>);
    // When disabled (null recordId), isLoading stays false and data is undefined
    await waitFor(() => expect(screen.queryByText('loading')).toBeNull());
    expect(screen.getByText('null-record')).toBeDefined();
  });

  it('returns a row when it exists in cache', async () => {
    const rows = makeRows(1, () => ({ Name: 'Task Alpha' }));
    const client = createTestClient({});
    // Seed the single-record query key
    client.queryClient.setQueryData(
      ['stackby', 'record', 'stk_test', 'Tasks', rows[0]!.id],
      { data: rows[0]!, meta: { rowIds: [rows[0]!.id], columnIds: [], cacheAgeMs: 0, truncated: false, upstreamCalls: 0 } },
    );
    function Comp() {
      const { data, isLoading } = useRecord('Tasks', rows[0]!.id);
      if (isLoading) return <div>loading</div>;
      return <div>{data ? data.id : 'none'}</div>;
    }
    render(<client.Provider><Comp /></client.Provider>);
    await waitFor(() => expect(screen.queryByText('loading')).toBeNull());
    expect(screen.getByText(rows[0]!.id)).toBeDefined();
  });
});

describe('useSearch', () => {
  it('returns empty when query is empty string', async () => {
    const client = createTestClient({});
    function Comp() {
      const { isEmpty, isLoading } = useSearch('Tasks', '');
      if (isLoading) return <div>loading</div>;
      return <div>{isEmpty ? 'empty' : 'has-results'}</div>;
    }
    render(<client.Provider><Comp /></client.Provider>);
    await waitFor(() => expect(screen.queryByText('loading')).toBeNull());
    expect(screen.getByText('empty')).toBeDefined();
  });

  it('calls gateway with contains filter for non-empty query', async () => {
    const calls: RequestInit[] = [];
    vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
      calls.push(init);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          data: [],
          meta: { rowIds: [], columnIds: [], cacheAgeMs: 0, truncated: false, upstreamCalls: 1 },
        }),
      };
    });

    const client = createTestClient({});
    function Comp() {
      const { isLoading } = useSearch('Tasks', 'fix bug', { columns: ['Name'] });
      return <div>{isLoading ? 'loading' : 'done'}</div>;
    }
    render(<client.Provider><Comp /></client.Provider>);
    await waitFor(() => expect(screen.queryByText('loading')).toBeNull());

    const body = JSON.parse(calls[0]?.body as string);
    expect(body.filter).toEqual({ column: 'Name', op: 'contains', value: 'fix bug' });
    vi.unstubAllGlobals();
  });
});

describe('useStack', () => {
  it('returns stackId and gatewayUrl from config', () => {
    const client = createTestClient({});
    let result: { stackId: string; gatewayUrl: string } | undefined;
    function Comp() {
      result = useStack();
      return null;
    }
    render(<client.Provider><Comp /></client.Provider>);
    expect(result?.stackId).toBe('stk_test');
    expect(result?.gatewayUrl).toBe('http://localhost:3003');
  });
});

describe('useDeepLink', () => {
  it('returns a URL containing table and recordId', () => {
    const client = createTestClient({});
    let url = '';
    function Comp() {
      const link = useDeepLink({ table: 'Tasks', recordId: 'row_0001' });
      url = link.url;
      return null;
    }
    render(<client.Provider><Comp /></client.Provider>);
    expect(url).toContain('table=Tasks');
    expect(url).toContain('recordId=row_0001');
    expect(url).toContain('stackId=stk_test');
  });
});
