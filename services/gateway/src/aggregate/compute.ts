export type AggFn = 'count' | 'sum' | 'avg' | 'min' | 'max' | 'countDistinct' | 'percentile';

export interface MetricSpec {
  fn: AggFn;
  column?: string | undefined;
  percentile?: number | undefined;
  alias?: string | undefined;
}

export interface GroupKey {
  [column: string]: unknown;
}

export interface AggregateResult {
  groups: Array<{
    key: GroupKey;
    metrics: Array<{ alias: string; value: number | null; basis: number }>;
  }>;
}

type RowLike = { fields: Record<string, unknown> };

function extractNumbers(rows: RowLike[], column: string): number[] {
  return rows
    .map((r) => r.fields[column])
    .filter((v): v is number => typeof v === 'number');
}

function computeMetric(
  rows: RowLike[],
  spec: MetricSpec,
): { value: number | null; basis: number } {
  const basis = rows.length;
  if (spec.fn === 'count') return { value: basis, basis };
  if (!spec.column) return { value: null, basis };

  if (spec.fn === 'countDistinct') {
    const vals = rows.map((r) => r.fields[spec.column!]);
    return { value: new Set(vals.filter((v) => v != null)).size, basis };
  }

  const nums = extractNumbers(rows, spec.column);
  if (nums.length === 0) return { value: null, basis };

  switch (spec.fn) {
    case 'sum':
      return { value: nums.reduce((a, b) => a + b, 0), basis };
    case 'avg':
      return { value: nums.reduce((a, b) => a + b, 0) / nums.length, basis };
    case 'min':
      return { value: Math.min(...nums), basis };
    case 'max':
      return { value: Math.max(...nums), basis };
    case 'percentile': {
      const p = spec.percentile ?? 50;
      const sorted = [...nums].sort((a, b) => a - b);
      const idx = Math.ceil((p / 100) * sorted.length) - 1;
      return { value: sorted[Math.max(0, idx)] ?? null, basis };
    }
    default:
      return { value: null, basis };
  }
}

export function computeAggregates(
  rows: RowLike[],
  metrics: MetricSpec[],
  groupBy?: string[],
): AggregateResult {
  if (!groupBy?.length) {
    return {
      groups: [
        {
          key: {},
          metrics: metrics.map((spec, i) => ({
            alias: spec.alias ?? `${spec.fn}_${i}`,
            ...computeMetric(rows, spec),
          })),
        },
      ],
    };
  }

  const groupMap = new Map<string, RowLike[]>();
  for (const row of rows) {
    const keyObj = Object.fromEntries(
      groupBy.map((col) => [col, row.fields[col] ?? null]),
    );
    const keyStr = JSON.stringify(keyObj);
    const existing = groupMap.get(keyStr) ?? [];
    existing.push(row);
    groupMap.set(keyStr, existing);
  }

  return {
    groups: [...groupMap.entries()].map(([keyStr, groupRows]) => ({
      key: JSON.parse(keyStr) as GroupKey,
      metrics: metrics.map((spec, i) => ({
        alias: spec.alias ?? `${spec.fn}_${i}`,
        ...computeMetric(groupRows, spec),
      })),
    })),
  };
}
