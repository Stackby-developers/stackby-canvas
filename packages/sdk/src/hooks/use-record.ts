import { useQuery } from '@tanstack/react-query';
import { useStackbyContext } from '../internal/context.js';
import { gatewayRead } from '../internal/gateway-fetch.js';
import { queryKeys } from '../internal/query-keys.js';
import type { GatewayRow } from '../internal/gateway-fetch.js';
import type { HookResult } from '../internal/result.js';

/**
 * Fetch a single row by ID from a Stackby table.
 *
 * @param tableId - The Stackby table ID
 * @param recordId - The row ID (null/undefined disables the query)
 */
export function useRecord(
  tableId: string,
  recordId: string | null | undefined,
): HookResult<GatewayRow | null> {
  const { config } = useStackbyContext();

  const query = useQuery({
    queryKey: queryKeys.record(config.stackId, tableId, recordId ?? ''),
    queryFn: async () => {
      const result = await gatewayRead({
        config,
        tableId,
        bindingId: tableId,
        filter: { column: 'id', op: 'is', value: recordId! },
      });
      const row = result.data[0] ?? null;
      return { data: row, meta: result.meta };
    },
    enabled: Boolean(recordId),
    staleTime: 30_000,
  });

  return {
    data: query.data?.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error instanceof Error ? query.error : null,
    isPermissionDenied: false,
    isEmpty: query.data?.data == null,
    isTruncated: false,
    meta: query.data?.meta ?? null,
    refetch: async () => {
      await query.refetch();
    },
  };
}
