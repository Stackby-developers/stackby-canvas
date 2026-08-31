import crypto from 'node:crypto';

export interface ViewerScope {
  viewerId: string;
  stackId: string;
  visibleTableIds: string[];
  visibleViewIds: string[];
  visibleColumnIds: string[];
  rowFilter?: Record<string, unknown>;
}

function sortKeys(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.keys(obj).sort().map((k) => [k, obj[k]]));
}

export function computePermissionScopeHash(scope: ViewerScope): string {
  const normalized = {
    tables: [...scope.visibleTableIds].sort(),
    views: [...scope.visibleViewIds].sort(),
    columns: [...scope.visibleColumnIds].sort(),
    filter: scope.rowFilter ? JSON.stringify(sortKeys(scope.rowFilter)) : null,
  };
  return crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}
