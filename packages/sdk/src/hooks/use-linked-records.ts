import { useQuery } from '@tanstack/react-query';
import { useStackbyContext } from '../internal/context.js';
import { gatewayRead } from '../internal/gateway-fetch.js';
import { queryKeys } from '../internal/query-keys.js';
import type { GatewayRow } from '../internal/gateway-fetch.js';
import type { HookResult } from '../internal/result.js';

/**
 * Fetch rows linked to a specific record via a link column.
 *
 * @param sourceTableId - Table containing the link column
 * @param recordId - Source row ID (null/undefined disables the query)
 * @param linkColumn - Name/ID of the link-type column
 * @param targetTableId - Table being linked to
 */
export function useLinkedRecords(
  sourceTableId: string,
  recordId: string | null | undefined,
  linkColumn: string,
  targetTableId: string,
): HookResult<GatewayRow[]> {
  const { config } = useStackbyContext();

  const query = useQuery({
    queryKey: queryKeys.linkedRecords(config.stackId, sourceTableId, recordId ?? '', linkColumn),
    queryFn: async () => {
      const sourceResult = await gatewayRead({
        config,
        tableId: sourceTableId,
        bindingId: sourceTableId,
        filter: { column: 'id', op: 'is', value: recordId! },
        columns: [linkColumn],
      });
      const sourceRow = sourceResult.data[0];
      const linkedIds = (sourceRow?.fields[linkColumn] ?? []) as string[];
      if (!linkedIds.length) return { data: [], meta: sourceResult.meta };

      const result = await gatewayRead({
        config,
        tableId: targetTableId,
        bindingId: targetTableId,
        filter: { column: 'id', op: 'anyOf', value: linkedIds },
      });
      return { data: result.data, meta: result.meta };
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
    isEmpty: (query.data?.data.length ?? 0) === 0,
    isTruncated: query.data?.meta.truncated ?? false,
    meta: query.data?.meta ?? null,
    refetch: async () => {
      await query.refetch();
    },
  };
}
