import type { ViewerScope } from '../permissions/scope-hash.js';

export interface ShapedRow {
  id: string;
  createdTime: string;
  fields: Record<string, unknown>;
}

export interface SortSpec {
  columnId: string;
  direction: 'asc' | 'desc';
}

// Column masking MUST happen before sorting to prevent leaking masked-column sort keys.
export function shapeRows(rows: ShapedRow[], scope: ViewerScope, sort?: SortSpec[]): ShapedRow[] {
  const masked =
    scope.visibleColumnIds[0] === '*'
      ? rows
      : rows.map((row) => {
          const allowed = new Set(scope.visibleColumnIds);
          return {
            ...row,
            fields: Object.fromEntries(
              Object.entries(row.fields).filter(([k]) => allowed.has(k)),
            ),
          };
        });

  if (!sort?.length) return masked;

  return [...masked].sort((a, b) => {
    for (const { columnId, direction } of sort) {
      const cmp = compareValues(a.fields[columnId], b.fields[columnId]);
      if (cmp !== 0) return direction === 'asc' ? cmp : -cmp;
    }
    return 0;
  });
}

function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}
