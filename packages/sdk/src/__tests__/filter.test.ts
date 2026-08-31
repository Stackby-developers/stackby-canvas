import { describe, it, expect } from 'vitest';
import { validateFilter, FilterConditionSchema } from '../filter/validate.js';
import { serializeFilter } from '../filter/serialize.js';
import type { FilterCondition } from '../filter/types.js';

const ALL_OPS = [
  'is', 'isNot', 'contains', 'doesNotContain', 'isEmpty', 'isNotEmpty',
  'gt', 'gte', 'lt', 'lte', 'before', 'after', 'onOrBefore', 'onOrAfter',
  'within', 'linkedTo', 'anyOf', 'allOf',
] as const;

describe('validateFilter', () => {
  it('parses a simple leaf condition', () => {
    const result = validateFilter({ column: 'Status', op: 'is', value: 'Active' });
    expect(result).toEqual({ column: 'Status', op: 'is', value: 'Active' });
  });

  it('parses all FilterOp values', () => {
    for (const op of ALL_OPS) {
      expect(() => validateFilter({ column: 'col', op, value: 'x' })).not.toThrow();
    }
  });

  it('parses a nested AND condition', () => {
    const filter: FilterCondition = {
      and: [
        { column: 'Status', op: 'is', value: 'Active' },
        { column: 'Priority', op: 'is', value: 'High' },
      ],
    };
    const result = validateFilter(filter);
    expect(result).toEqual(filter);
  });

  it('parses a nested OR condition', () => {
    const filter: FilterCondition = {
      or: [
        { column: 'Status', op: 'is', value: 'Todo' },
        { column: 'Status', op: 'is', value: 'In Progress' },
      ],
    };
    const result = validateFilter(filter);
    expect(result).toEqual(filter);
  });

  it('parses deeply nested and/or', () => {
    const filter: FilterCondition = {
      and: [
        { column: 'Active', op: 'is', value: true },
        { or: [{ column: 'Status', op: 'is', value: 'A' }, { column: 'Status', op: 'is', value: 'B' }] },
      ],
    };
    expect(() => validateFilter(filter)).not.toThrow();
  });

  it('parses RelativeDate values', () => {
    const dates = ['today', 'yesterday', 'thisWeek', 'lastWeek', 'thisMonth', 'thisQuarter', 'thisYear'] as const;
    for (const d of dates) {
      expect(() => validateFilter({ column: 'DueDate', op: 'within', value: d })).not.toThrow();
    }
  });

  it('parses lastNDays object', () => {
    const result = validateFilter({ column: 'DueDate', op: 'within', value: { lastNDays: 7 } });
    expect(result).toEqual({ column: 'DueDate', op: 'within', value: { lastNDays: 7 } });
  });

  it('parses array of strings for anyOf', () => {
    const result = validateFilter({ column: 'Tags', op: 'anyOf', value: ['Frontend', 'Backend'] });
    expect(result).toEqual({ column: 'Tags', op: 'anyOf', value: ['Frontend', 'Backend'] });
  });

  it('allows missing value field', () => {
    expect(() => validateFilter({ column: 'Status', op: 'isEmpty' })).not.toThrow();
  });

  it('throws on invalid op', () => {
    expect(() => validateFilter({ column: 'x', op: 'invalidOp', value: 'y' })).toThrow();
  });

  it('throws on missing column', () => {
    expect(() => validateFilter({ op: 'is', value: 'x' })).toThrow();
  });
});

describe('serializeFilter', () => {
  it('round-trips through JSON.stringify', () => {
    const filter: FilterCondition = {
      and: [
        { column: 'Status', op: 'is', value: 'Active' },
        { column: 'DueDate', op: 'before', value: 'today' },
      ],
    };
    const serialized = serializeFilter(filter);
    const roundTripped = JSON.parse(JSON.stringify(serialized));
    expect(roundTripped).toEqual(filter);
  });

  it('returns the same object reference (no transformation needed)', () => {
    const filter: FilterCondition = { column: 'x', op: 'is', value: 1 };
    expect(serializeFilter(filter)).toBe(filter);
  });
});
