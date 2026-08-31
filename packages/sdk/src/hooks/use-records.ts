import { useQuery } from '@tanstack/react-query';
import { useStackbyContext } from '../internal/context.js';
import { gatewayRead } from '../internal/gateway-fetch.js';
import { queryKeys } from '../internal/query-keys.js';
import { toHookResult, type HookResult } from '../internal/result.js';
import type { FilterCondition } from '../filter/types.js';
import type { GatewayRow } from '../internal/gateway-fetch.js';

export interface UseRecordsOptions {
  /** View ID to filter/sort by */
  view?: string;
  filter?: FilterCondition;
  sort?: Array<{ columnId: string; direction: 'asc' | 'desc' }>;
  /** Specific column names/IDs to fetch */
  columns?: string[];
  /** Page number (1-indexed) */
  page?: number;
  /** Binding ID declared at build time */
  bindingId?: string;
  /** Override TanStack Query stale time (ms) */
  cacheTtl?: number;
  /** Disable the query */
  enabled?: boolean;
}

/**
 * Fetch all rows from a Stackby table via the Data Gateway.
 *
 * @param tableId - The Stackby table ID or name
 * @param options - Query options
 * @returns Hook result with rows, loading state, and metadata
 *
 * @example
 * ```tsx
 * const { data: tasks, isLoading, isEmpty } = useRecords('tbl_tasks');
 * if (isLoading) return <Spinner />;
 * if (isEmpty) return <EmptyState />;
 * return <TaskList tasks={tasks} />;
 * ```
 */
export function useRecords(
  tableId: string,
  options: UseRecordsOptions = {},
): HookResult<GatewayRow[]> {
  const { config } = useStackbyContext();
  const opts = {
    view: options.view,
    filter: options.filter,
    sort: options.sort,
    columns: options.columns,
    page: options.page ?? 1,
    bindingId: options.bindingId ?? tableId,
  };

  const query = useQuery({
    queryKey: queryKeys.records(config.stackId, tableId, opts),
    queryFn: async () => {
      const result = await gatewayRead({
        config,
        tableId,
        bindingId: opts.bindingId,
        viewId: options.view,
        columns: options.columns,
        filter: options.filter,
        sort: options.sort,
        page: opts.page,
      });
      return { data: result.data, meta: result.meta };
    },
    staleTime: options.cacheTtl ?? 30_000,
    enabled: options.enabled ?? true,
    retry: (failureCount, error) => {
      if ((error as Error & { isPermissionDenied?: boolean }).isPermissionDenied) return false;
      return failureCount < 2;
    },
  });

  return toHookResult(query);
}
