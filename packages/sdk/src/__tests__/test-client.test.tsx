import { describe, it, expect } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import React from 'react';
import { createTestClient } from '../test-utils/create-test-client.js';
import { makeRows } from '../test-utils/fixtures.js';
import { useRecords } from '../hooks/use-records.js';

function RowList({ tableId }: { tableId: string }) {
  const { data, isLoading, error } = useRecords(tableId);
  if (isLoading) return <div>loading</div>;
  if (error) return <div>error: {error.message}</div>;
  if (!data?.length) return <div>empty</div>;
  return (
    <ul>
      {data.map((r) => (
        <li key={r.id}>{String(r.fields['Name'] ?? r.id)}</li>
      ))}
    </ul>
  );
}

describe('createTestClient', () => {
  it('Provider renders without error', () => {
    const client = createTestClient({});
    expect(() =>
      render(<client.Provider><div>hello</div></client.Provider>),
    ).not.toThrow();
  });

  it('useRecords returns fixture data without network calls', async () => {
    const rows = makeRows(2, (i) => ({ Name: `Task ${i + 1}` }));
    const client = createTestClient({ Tasks: rows });

    render(
      <client.Provider>
        <RowList tableId="Tasks" />
      </client.Provider>,
    );

    await waitFor(() => expect(screen.queryByText('loading')).toBeNull());
    expect(screen.getByText('Task 1')).toBeDefined();
    expect(screen.getByText('Task 2')).toBeDefined();
  });

  it('mockTable updates data and component re-renders', async () => {
    const initial = makeRows(1, () => ({ Name: 'Original' }));
    const client = createTestClient({ Tasks: initial });

    render(
      <client.Provider>
        <RowList tableId="Tasks" />
      </client.Provider>,
    );

    await waitFor(() => screen.getByText('Original'));

    const updated = makeRows(1, () => ({ Name: 'Updated' }));
    act(() => {
      client.mockTable('Tasks', updated);
    });

    await waitFor(() => screen.getByText('Updated'));
    expect(screen.queryByText('Original')).toBeNull();
  });

  it('mockError removes cached data for that table', () => {
    const rows = makeRows(2);
    const client = createTestClient({ Tasks: rows });

    // Verify data is initially present
    const before = client.queryClient.getQueriesData({
      queryKey: ['stackby', 'records', 'stk_test', 'Tasks'],
    });
    expect(before.length).toBeGreaterThan(0);

    // After mockError, cache entry should be removed
    client.mockError('Tasks', new Error('forbidden'));
    const after = client.queryClient.getQueriesData({
      queryKey: ['stackby', 'records', 'stk_test', 'Tasks'],
    });
    expect(after.length).toBe(0);
  });

  it('reset restores original fixtures', async () => {
    const original = makeRows(1, () => ({ Name: 'Original' }));
    const client = createTestClient({ Tasks: original });

    client.mockTable('Tasks', makeRows(1, () => ({ Name: 'Modified' })));
    client.reset();

    render(
      <client.Provider>
        <RowList tableId="Tasks" />
      </client.Provider>,
    );

    await waitFor(() => screen.getByText('Original'));
    expect(screen.getByText('Original')).toBeDefined();
  });
});
