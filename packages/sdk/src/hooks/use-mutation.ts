import { useMutation as useTanStackMutation, useQueryClient } from '@tanstack/react-query';
import { useStackbyContext } from '../internal/context.js';
import { gatewayMutate } from '../internal/gateway-fetch.js';
import type { GatewayRow } from '../internal/gateway-fetch.js';

export type MutationOp = 'create' | 'update' | 'delete';

export interface MutationRecord {
  id?: string;
  fields?: Record<string, unknown>;
}

export interface MutationResult {
  results: Array<{ id?: string; error?: string }>;
}

export interface UseMutationOptions {
  bindingId?: string;
}

export interface UseMutationResult {
  mutate: (records: MutationRecord | MutationRecord[]) => void;
  mutateAsync: (records: MutationRecord | MutationRecord[]) => Promise<MutationResult>;
  isLoading: boolean;
  error: Error | null;
  reset: () => void;
}

/**
 * Create, update, or delete rows in a Stackby table with optimistic updates and automatic rollback.
 * An idempotency key is generated per invocation.
 *
 * @param tableId - Target table ID
 * @param op - The operation: 'create' | 'update' | 'delete'
 */
export function useMutation(
  tableId: string,
  op: MutationOp,
  options: UseMutationOptions = {},
): UseMutationResult {
  const { config } = useStackbyContext();
  const queryClient = useQueryClient();

  const mutation = useTanStackMutation({
    mutationFn: async (records: MutationRecord[]) => {
      const idempotencyKey = crypto.randomUUID();
      return gatewayMutate({
        config,
        tableId,
        bindingId: options.bindingId ?? tableId,
        op,
        records,
        idempotencyKey,
      });
    },
    onMutate: async (records: MutationRecord[]) => {
      await queryClient.cancelQueries({
        queryKey: ['stackby', 'records', config.stackId, tableId],
      });

      const previousData = queryClient.getQueriesData<{
        data: GatewayRow[];
        meta: unknown;
      }>({ queryKey: ['stackby', 'records', config.stackId, tableId] });

      queryClient.setQueriesData<{ data: GatewayRow[]; meta: unknown }>(
        { queryKey: ['stackby', 'records', config.stackId, tableId] },
        (old) => {
          if (!old) return old;
          if (op === 'create') {
            const newRows: GatewayRow[] = records.map((r, i) => ({
              id: `__optimistic_${Date.now()}_${i}`,
              createdTime: new Date().toISOString(),
              fields: r.fields ?? {},
            }));
            return { ...old, data: [...old.data, ...newRows] };
          }
          if (op === 'delete') {
            const ids = new Set(records.map((r) => r.id));
            return { ...old, data: old.data.filter((row) => !ids.has(row.id)) };
          }
          if (op === 'update') {
            return {
              ...old,
              data: old.data.map((row) => {
                const update = records.find((r) => r.id === row.id);
                return update ? { ...row, fields: { ...row.fields, ...update.fields } } : row;
              }),
            };
          }
          return old;
        },
      );

      return { previousData };
    },
    onError: (_err, _records, context) => {
      if (context?.previousData) {
        for (const [queryKey, data] of context.previousData) {
          queryClient.setQueryData(queryKey, data);
        }
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: ['stackby', 'records', config.stackId, tableId],
      });
    },
  });

  const normalise = (r: MutationRecord | MutationRecord[]): MutationRecord[] =>
    Array.isArray(r) ? r : [r];

  return {
    mutate: (records) => mutation.mutate(normalise(records)),
    mutateAsync: (records) => mutation.mutateAsync(normalise(records)),
    isLoading: mutation.isPending,
    error: mutation.error instanceof Error ? mutation.error : null,
    reset: mutation.reset,
  };
}
