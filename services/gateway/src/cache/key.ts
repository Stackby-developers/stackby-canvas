import crypto from 'node:crypto';

export interface CacheKeyParams {
  stackId: string;
  tableId: string;
  viewId?: string | undefined;
  filter?: Record<string, unknown> | undefined;
  sort?: Array<{ columnId: string; direction: 'asc' | 'desc' }> | undefined;
  page: number;
  columns: string[];
  // CRITICAL: cache entries MUST NOT be shared across permission scopes.
  // Omitting permissionScopeHash from this key would enable cache-poisoning attacks.
  permissionScopeHash: string;
}

function sortKeys(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.keys(obj).sort().map((k) => [k, obj[k]]));
}

export function buildCacheKey(params: CacheKeyParams): string {
  const normalized = {
    s: params.stackId,
    t: params.tableId,
    v: params.viewId ?? null,
    f: params.filter ? sortKeys(params.filter) : null,
    so: params.sort ?? null,
    p: params.page,
    c: [...params.columns].sort(),
    psh: params.permissionScopeHash,
  };
  const hash = crypto
    .createHash('sha256')
    .update(JSON.stringify(normalized))
    .digest('hex');
  return `dg:rows:${hash}`;
}
