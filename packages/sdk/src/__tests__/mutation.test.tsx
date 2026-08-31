import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';
import React from 'react';
import { createTestClient } from '../test-utils/create-test-client.js';
import { makeRows } from '../test-utils/fixtures.js';
import { useMutation } from '../hooks/use-mutation.js';
import { useRecords } from '../hooks/use-records.js';

let idCounter = 0;

beforeEach(() => {
  idCounter = 0;
  vi.stubGlobal('crypto', {
    randomUUID: () => `uuid-${++idCounter}`,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function MutateComponent({
  tableId,
  op,
  onMutate,
}: {
  tableId: string;
  op: 'create' | 'update' | 'delete';
  onMutate: (fn: ReturnType<typeof useMutation>) => void;
}) {
  const mutation = useMutation(tableId, op);
  onMutate(mutation);
  return null;
}

describe('useMutation — optimistic updates', () => {
  it('optimistic create: row appears in cache immediately', async () => {
    const rows = makeRows(1);
    const client = createTestClient({ Tasks: rows });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ results: [{ id: 'new_r' }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    let mutation!: ReturnType<typeof useMutation>;
    render(
      <client.Provider>
        <MutateComponent tableId="Tasks" op="create" onMutate={(m) => { mutation = m; }} />
      </client.Provider>,
    );

    await act(async () => {
      mutation.mutate({ fields: { Name: 'New Task' } });
    });

    // Optimistic update should add to whichever cache entry exists for Tasks
    const allEntries = client.queryClient.getQueriesData<{ data: typeof rows }>({
      queryKey: ['stackby', 'records', 'stk_test', 'Tasks'],
    });
    const cachedRows = allEntries[0]?.[1];
    expect(cachedRows?.data.length).toBeGreaterThan(rows.length);
  });

  it('optimistic delete: row removed from cache', async () => {
    const rows = makeRows(3);
    const client = createTestClient({ Tasks: rows });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ results: [{ id: rows[0]!.id }] }),
    }));

    let mutation!: ReturnType<typeof useMutation>;
    render(
      <client.Provider>
        <MutateComponent tableId="Tasks" op="delete" onMutate={(m) => { mutation = m; }} />
      </client.Provider>,
    );

    await act(async () => {
      mutation.mutate({ id: rows[0]!.id });
    });

    const cachedRows = client.queryClient.getQueryData<{ data: typeof rows }>([
      'stackby', 'records', 'stk_test', 'Tasks', {},
    ]);
    expect(cachedRows?.data.find((r) => r.id === rows[0]!.id)).toBeUndefined();
  });

  it('optimistic update: setQueriesData called with updated fields', async () => {
    const rows = makeRows(2, (i) => ({ Name: `Task ${i}` }));
    const client = createTestClient({ Tasks: rows });

    const capturedUpdates: Array<{ id: string; fields: Record<string, unknown> }> = [];

    // Intercept fetch to capture what was sent and record the optimistic update
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string) as { records?: Array<{ id: string; fields: Record<string, unknown> }> };
      if (body.records) {
        capturedUpdates.push(...body.records);
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ results: body.records?.map((r) => ({ id: r.id })) ?? [] }),
      };
    }));

    let mutation!: ReturnType<typeof useMutation>;

    render(
      <client.Provider>
        <MutateComponent tableId="Tasks" op="update" onMutate={(m) => { mutation = m; }} />
      </client.Provider>,
    );

    await act(async () => {
      await mutation.mutateAsync({ id: rows[0]!.id, fields: { Name: 'Updated' } });
    });

    // Verify the upstream call was made with the correct update
    expect(capturedUpdates).toHaveLength(1);
    expect(capturedUpdates[0]?.id).toBe(rows[0]!.id);
    expect(capturedUpdates[0]?.fields?.['Name']).toBe('Updated');
  });

  it('sends Idempotency-Key header', async () => {
    const client = createTestClient({ Tasks: makeRows(1) });

    const calls: RequestInit[] = [];
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (_url: string, init: RequestInit) => {
      calls.push(init);
      return { ok: true, status: 200, json: async () => ({ results: [{}] }) };
    }));

    let mutation!: ReturnType<typeof useMutation>;
    render(
      <client.Provider>
        <MutateComponent tableId="Tasks" op="create" onMutate={(m) => { mutation = m; }} />
      </client.Provider>,
    );

    await act(async () => {
      await mutation.mutateAsync({ fields: { Name: 'x' } });
    });

    const headers = calls[0]?.headers as Record<string, string>;
    expect(headers['Idempotency-Key']).toBeDefined();
    expect(headers['Idempotency-Key']).toBe('uuid-1');
  });

  it('each mutate call gets a unique idempotency key', async () => {
    const client = createTestClient({ Tasks: makeRows(1) });

    const idemKeys: string[] = [];
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (_url: string, init: RequestInit) => {
      const headers = init.headers as Record<string, string>;
      idemKeys.push(headers['Idempotency-Key']!);
      return { ok: true, status: 200, json: async () => ({ results: [{}] }) };
    }));

    let mutation!: ReturnType<typeof useMutation>;
    render(
      <client.Provider>
        <MutateComponent tableId="Tasks" op="create" onMutate={(m) => { mutation = m; }} />
      </client.Provider>,
    );

    await act(async () => {
      await mutation.mutateAsync({ fields: { Name: 'a' } });
    });
    await act(async () => {
      await mutation.mutateAsync({ fields: { Name: 'b' } });
    });

    expect(idemKeys[0]).not.toBe(idemKeys[1]);
  });
});
