import { useQuery } from '@tanstack/react-query';
import { useStackbyContext } from '../internal/context.js';
import { gatewayAggregate } from '../internal/gateway-fetch.js';
import { queryKeys } from '../internal/query-keys.js';
import type { FilterCondition } from '../filter/types.js';

export interface AggregateMetric {
  fn: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'countDistinct' | 'percentile';
  column?: string;
  percentile?: number;
  alias?: string;
}

export interface AggregateGroup {
  key: Record<string, unknown>;
  metrics: Array<{ alias: string; value: number | null; basis: number }>;
}

export interface UseAggregateOptions {
  groupBy?: string[];
  metrics: AggregateMetric[];
  filter?: FilterCondition;
  bindingId?: string;
  enabled?: boolean;
}

export interface UseAggregateResult {
  groups: AggregateGroup[] | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Compute server-side aggregates over a Stackby table.
 * Raw rows are never shipped to the client for aggregation.
 */
export function useAggregate(tableId: string, options: UseAggregateOptions): UseAggregateResult {
  const { config } = useStackbyContext();

  const query = useQuery({
    queryKey: queryKeys.aggregate(config.stackId, tableId, options),
    queryFn: async () =>
      gatewayAggregate({
        config,
        tableId,
        bindingId: options.bindingId ?? tableId,
        groupBy: options.groupBy,
        metrics: options.metrics,
        filter: options.filter,
      }),
    enabled: options.enabled ?? true,
    staleTime: 30_000,
  });

  return {
    groups: (query.data as { groups: AggregateGroup[] } | undefined)?.groups,
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error : null,
    refetch: async () => {
      await query.refetch();
    },
  };
}
