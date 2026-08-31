import { useQuery } from '@tanstack/react-query';
import { useStackbyContext } from '../internal/context.js';
import { gatewayRead } from '../internal/gateway-fetch.js';
import type { GatewayRow } from '../internal/gateway-fetch.js';
import type { HookResult } from '../internal/result.js';
import type { FilterCondition } from '../filter/types.js';

/**
 * Full-text search across specified columns of a table.
 * Uses a server-side contains filter — does not download rows locally.
 */
export function useSearch(
  tableId: string,
  query: string,
  options: { columns?: string[]; enabled?: boolean } = {},
): HookResult<GatewayRow[]> {
  const { config } = useStackbyContext();
  const trimmed = query.trim();

  const q = useQuery({
    queryKey: ['stackby', 'search', config.stackId, tableId, trimmed, options.columns],
    queryFn: async () => {
      if (!trimmed) {
        return {
          data: [],
          meta: {
            rowIds: [],
            columnIds: [],
            cacheAgeMs: 0,
            truncated: false,
            upstreamCalls: 0,
          },
        };
      }

      const cols = options.columns ?? [];
      let filter: FilterCondition;
      if (cols.length > 1) {
        filter = {
          or: cols.map((c) => ({ column: c, op: 'contains' as const, value: trimmed })),
        };
      } else if (cols.length === 1) {
        filter = { column: cols[0]!, op: 'contains', value: trimmed };
      } else {
        filter = { column: '_search', op: 'contains', value: trimmed };
      }

      const result = await gatewayRead({ config, tableId, bindingId: tableId, filter });
      return { data: result.data, meta: result.meta };
    },
    enabled: options.enabled ?? true,
    staleTime: 10_000,
  });

  return {
    data: q.data?.data,
    isLoading: q.isLoading,
    isFetching: q.isFetching,
    error: q.error instanceof Error ? q.error : null,
    isPermissionDenied: false,
    isEmpty: (q.data?.data.length ?? 0) === 0,
    isTruncated: q.data?.meta.truncated ?? false,
    meta: q.data?.meta ?? null,
    refetch: async () => {
      await q.refetch();
    },
  };
}
