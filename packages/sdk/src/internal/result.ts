import type { GatewayReadResult } from './gateway-fetch.js';

export interface HookMeta {
  rowIds: string[];
  columnIds: string[];
  cacheAgeMs: number;
  truncated: boolean;
  upstreamCalls: number;
}

export interface HookResult<T> {
  data: T | undefined;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  /** True when the gateway returned 403 — render a permission-denied state */
  isPermissionDenied: boolean;
  /** True when data is an empty array or null */
  isEmpty: boolean;
  /** True when the row set was capped at the server's row ceiling */
  isTruncated: boolean;
  meta: HookMeta | null;
  refetch: () => Promise<void>;
}

export function toHookResult<T>(queryResult: {
  data: { data: T; meta: GatewayReadResult['meta'] } | undefined;
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
  refetch: () => Promise<unknown>;
}): HookResult<T> {
  const err = queryResult.error instanceof Error ? queryResult.error : null;
  const isPermissionDenied =
    err !== null &&
    (err as Error & { isPermissionDenied?: boolean }).isPermissionDenied === true;
  const rawData = queryResult.data?.data;
  return {
    data: rawData,
    isLoading: queryResult.isLoading,
    isFetching: queryResult.isFetching,
    error: err,
    isPermissionDenied,
    isEmpty: Array.isArray(rawData) ? rawData.length === 0 : rawData == null,
    isTruncated: queryResult.data?.meta.truncated ?? false,
    meta: queryResult.data?.meta ?? null,
    refetch: async () => {
      await queryResult.refetch();
    },
  };
}
