import { describe, it, expect } from 'vitest';
import { computeAggregates } from '../aggregate/compute.js';

const rows = [
  { fields: { status: 'Done', hours: 3, tags: ['Frontend'] } },
  { fields: { status: 'Done', hours: 5, tags: ['Backend'] } },
  { fields: { status: 'Todo', hours: null, tags: ['Frontend'] } },
  { fields: { status: 'Todo', hours: 2, tags: ['Frontend', 'Backend'] } },
] as Array<{ fields: Record<string, unknown> }>;

describe('computeAggregates — no groupBy', () => {
  it('count returns 4, basis 4', () => {
    const r = computeAggregates(rows, [{ fn: 'count', alias: 'n' }]);
    expect(r.groups[0]!.metrics[0]).toMatchObject({ alias: 'n', value: 4, basis: 4 });
  });

  it('sum of hours = 10 (null ignored), basis 4', () => {
    const r = computeAggregates(rows, [{ fn: 'sum', column: 'hours', alias: 'total' }]);
    expect(r.groups[0]!.metrics[0]).toMatchObject({ alias: 'total', value: 10, basis: 4 });
  });

  it('avg of hours ≈ 3.33 (3 non-null values), basis 4', () => {
    const r = computeAggregates(rows, [{ fn: 'avg', column: 'hours', alias: 'avg' }]);
    const val = r.groups[0]!.metrics[0]!.value as number;
    expect(val).toBeCloseTo(10 / 3, 5);
    expect(r.groups[0]!.metrics[0]!.basis).toBe(4);
  });

  it('min of hours = 2', () => {
    const r = computeAggregates(rows, [{ fn: 'min', column: 'hours', alias: 'min' }]);
    expect(r.groups[0]!.metrics[0]!.value).toBe(2);
  });

  it('max of hours = 5', () => {
    const r = computeAggregates(rows, [{ fn: 'max', column: 'hours', alias: 'max' }]);
    expect(r.groups[0]!.metrics[0]!.value).toBe(5);
  });

  it('countDistinct of status = 2', () => {
    const r = computeAggregates(rows, [{ fn: 'countDistinct', column: 'status', alias: 'ds' }]);
    expect(r.groups[0]!.metrics[0]!.value).toBe(2);
  });

  it('percentile(50) of hours [2,3,5] = 3', () => {
    const r = computeAggregates(rows, [{ fn: 'percentile', column: 'hours', percentile: 50, alias: 'p50' }]);
    expect(r.groups[0]!.metrics[0]!.value).toBe(3);
  });

  it('returns null value when no matching numeric values', () => {
    const r = computeAggregates(rows, [{ fn: 'sum', column: 'nonexistent', alias: 'x' }]);
    expect(r.groups[0]!.metrics[0]!.value).toBeNull();
  });
});

describe('computeAggregates — groupBy status', () => {
  it('produces two groups: Done and Todo', () => {
    const r = computeAggregates(rows, [{ fn: 'sum', column: 'hours', alias: 'hrs' }], ['status']);
    expect(r.groups).toHaveLength(2);

    const done = r.groups.find((g) => g.key['status'] === 'Done');
    const todo = r.groups.find((g) => g.key['status'] === 'Todo');

    expect(done).toBeDefined();
    expect(todo).toBeDefined();
    expect(done!.metrics[0]!.value).toBe(8);  // 3 + 5
    expect(todo!.metrics[0]!.value).toBe(2);  // null + 2 = 2
  });

  it('each group result includes basis = group row count', () => {
    const r = computeAggregates(rows, [{ fn: 'count' }], ['status']);
    for (const group of r.groups) {
      expect(group.metrics[0]!.basis).toBe(group.metrics[0]!.value);
    }
  });

  it('basis equals total group size (not just non-null)', () => {
    const r = computeAggregates(rows, [{ fn: 'avg', column: 'hours' }], ['status']);
    const todo = r.groups.find((g) => g.key['status'] === 'Todo');
    // Todo group: 2 rows, 1 null → basis should be 2 (total), not 1
    expect(todo!.metrics[0]!.basis).toBe(2);
  });
});
