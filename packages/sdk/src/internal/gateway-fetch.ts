import type { StackbyConfig } from './context.js';
import type { FilterCondition } from '../filter/types.js';
import { serializeFilter } from '../filter/serialize.js';

export interface GatewayReadParams {
  config: StackbyConfig;
  tableId: string;
  bindingId: string;
  viewId?: string | undefined;
  columns?: string[] | undefined;
  filter?: FilterCondition | undefined;
  sort?: Array<{ columnId: string; direction: 'asc' | 'desc' }> | undefined;
  page?: number | undefined;
}

export interface GatewayRow {
  id: string;
  createdTime: string;
  fields: Record<string, unknown>;
}

export interface GatewayReadResult {
  data: GatewayRow[];
  meta: {
    rowIds: string[];
    columnIds: string[];
    cacheAgeMs: number;
    truncated: boolean;
    upstreamCalls: number;
  };
}

export interface GatewayAggregateParams {
  config: StackbyConfig;
  tableId: string;
  bindingId: string;
  groupBy?: string[] | undefined;
  metrics: Array<{
    fn: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'countDistinct' | 'percentile';
    column?: string | undefined;
    percentile?: number | undefined;
    alias?: string | undefined;
  }>;
  filter?: FilterCondition | undefined;
}

export interface GatewayMutateParams {
  config: StackbyConfig;
  tableId: string;
  bindingId: string;
  op: 'create' | 'update' | 'delete';
  records: Array<{ id?: string; fields?: Record<string, unknown> }>;
  idempotencyKey: string;
}

function authHeaders(config: StackbyConfig): Record<string, string> {
  return {
    Authorization: `Bearer ${config.authToken}`,
    'Content-Type': 'application/json',
    'X-Artifact-Id': config.artifactId,
  };
}

export async function gatewayRead(params: GatewayReadParams): Promise<GatewayReadResult> {
  const url = `${params.config.gatewayUrl}/dg/v1/read`;
  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders(params.config),
    body: JSON.stringify({
      stackId: params.config.stackId,
      tableId: params.tableId,
      bindingId: params.bindingId,
      viewId: params.viewId,
      columns: params.columns ?? [],
      filter: params.filter ? serializeFilter(params.filter) : undefined,
      sort: params.sort,
      page: params.page ?? 1,
    }),
  });
  if (res.status === 403) {
    const err = new Error('Permission denied');
    (err as Error & { isPermissionDenied: boolean }).isPermissionDenied = true;
    throw err;
  }
  if (!res.ok) {
    throw new Error(`Gateway read failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<GatewayReadResult>;
}

export async function gatewayAggregate(params: GatewayAggregateParams): Promise<unknown> {
  const url = `${params.config.gatewayUrl}/dg/v1/aggregate`;
  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders(params.config),
    body: JSON.stringify({
      stackId: params.config.stackId,
      tableId: params.tableId,
      bindingId: params.bindingId,
      groupBy: params.groupBy,
      metrics: params.metrics,
      filter: params.filter ? serializeFilter(params.filter) : undefined,
    }),
  });
  if (!res.ok) throw new Error(`Gateway aggregate failed: ${res.status}`);
  return res.json();
}

export async function gatewayMutate(
  params: GatewayMutateParams,
): Promise<{ results: Array<{ id?: string; error?: string }> }> {
  const url = `${params.config.gatewayUrl}/dg/v1/mutate`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...authHeaders(params.config),
      'Idempotency-Key': params.idempotencyKey,
    },
    body: JSON.stringify({
      stackId: params.config.stackId,
      tableId: params.tableId,
      bindingId: params.bindingId,
      op: params.op,
      records: params.records,
    }),
  });
  if (!res.ok) throw new Error(`Gateway mutate failed: ${res.status}`);
  return res.json() as Promise<{ results: Array<{ id?: string; error?: string }> }>;
}

export async function gatewayMe(config: StackbyConfig): Promise<unknown> {
  const url = `${config.gatewayUrl}/dg/v1/me`;
  const res = await fetch(url, { method: 'GET', headers: authHeaders(config) });
  if (!res.ok) throw new Error(`Gateway /me failed: ${res.status}`);
  return res.json();
}

export async function gatewayUpload(
  config: StackbyConfig,
  tableId: string,
  _columnId: string,
  file: File,
): Promise<{ filename: string; mime: string; size: number; status: string }> {
  const url = `${config.gatewayUrl}/dg/v1/upload`;
  const form = new FormData();
  form.append('file', file);
  form.append('tableId', tableId);
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.authToken}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Gateway upload failed: ${res.status}`);
  return res.json() as Promise<{ filename: string; mime: string; size: number; status: string }>;
}
