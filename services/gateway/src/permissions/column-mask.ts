import type { ViewerScope } from './scope-hash.js';

export type MaskableRow = { id: string; createdTime: string; fields: Record<string, unknown> };

// Column masking always runs at serve time — cached rows are never pre-masked.
// A '*' sentinel means all columns are visible (studio sessions, full-access viewers).
export function maskColumns(rows: MaskableRow[], scope: ViewerScope): MaskableRow[] {
  if (scope.visibleColumnIds[0] === '*') return rows;
  const allowed = new Set(scope.visibleColumnIds);
  return rows.map((row) => ({
    ...row,
    fields: Object.fromEntries(Object.entries(row.fields).filter(([k]) => allowed.has(k))),
  }));
}
