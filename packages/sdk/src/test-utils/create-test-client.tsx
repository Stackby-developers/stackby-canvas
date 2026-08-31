import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { StackbyContext, type StackbyConfig } from '../internal/context.js';
import type { GatewayRow } from '../internal/gateway-fetch.js';

export type TableFixtures = Record<string, GatewayRow[]>;
export type TableErrors = Record<string, Error>;

export interface TestClient {
  /** Wrap your component under test with this provider */
  Provider: ({ children }: { children: ReactNode }) => React.JSX.Element;
  /** Replace a table's rows with new fixtures */
  mockTable: (tableName: string, rows: GatewayRow[]) => void;
  /** Make a table throw an error */
  mockError: (tableName: string, error: Error) => void;
  /** Reset all mocks to initial fixtures */
  reset: () => void;
  /** Access the underlying QueryClient for assertions */
  queryClient: QueryClient;
}

function makeMeta(rows: GatewayRow[]) {
  return {
    rowIds: rows.map((r) => r.id),
    columnIds: [],
    cacheAgeMs: 0,
    truncated: false,
    upstreamCalls: 0,
  };
}

const STACK_ID = 'stk_test';

/**
 * Build the cache key that useRecords generates for a default (no-options) call.
 * Must stay in sync with queryKeys.records and useRecords opts construction.
 */
function defaultRecordsKey(tableId: string) {
  return [
    'stackby',
    'records',
    STACK_ID,
    tableId,
    { view: undefined, filter: undefined, sort: undefined, columns: undefined, page: 1, bindingId: tableId },
  ];
}

/**
 * Create a mock Stackby provider with deterministic fixture data for testing generated artifacts.
 * Pre-populates the TanStack Query cache so components render immediately without network calls.
 *
 * @example
 * ```tsx
 * const client = createTestClient({
 *   Tasks: [{ id: 'r1', createdTime: '2026-01-01T00:00:00Z', fields: { Name: 'Fix bug' } }],
 * });
 * render(<client.Provider><MyComponent /></client.Provider>);
 * ```
 */
export function createTestClient(initialFixtures: TableFixtures = {}): TestClient {
  const fixtures: TableFixtures = { ...initialFixtures };
  const errors: TableErrors = {};

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  const config: StackbyConfig = {
    gatewayUrl: 'http://localhost:3003',
    authToken: 'test-token',
    stackId: STACK_ID,
    artifactId: 'art_test',
  };

  const seedCache = () => {
    for (const [tableId, rows] of Object.entries(fixtures)) {
      if (errors[tableId]) continue;
      queryClient.setQueryData(defaultRecordsKey(tableId), {
        data: rows,
        meta: makeMeta(rows),
      });
    }
  };
  seedCache();

  function Provider({ children }: { children: ReactNode }): React.JSX.Element {
    return createElement(
      StackbyContext.Provider,
      { value: { config } },
      createElement(QueryClientProvider, { client: queryClient }, children),
    );
  }

  return {
    Provider,
    queryClient,
    mockTable(tableName, rows) {
      fixtures[tableName] = rows;
      delete errors[tableName];
      queryClient.setQueryData(defaultRecordsKey(tableName), {
        data: rows,
        meta: makeMeta(rows),
      });
    },
    mockError(tableName, error) {
      errors[tableName] = error;
      // Remove data so the hook re-fetches and hits the error
      queryClient.removeQueries({
        predicate: (q) => {
          const k = q.queryKey as unknown[];
          return k[0] === 'stackby' && k[1] === 'records' && k[3] === tableName;
        },
      });
    },
    reset() {
      for (const k of Object.keys(fixtures)) delete fixtures[k];
      for (const k of Object.keys(errors)) delete errors[k];
      Object.assign(fixtures, initialFixtures);
      seedCache();
    },
  };
}
