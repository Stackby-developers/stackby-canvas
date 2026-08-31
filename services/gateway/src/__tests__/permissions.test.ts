import { describe, it, expect } from 'vitest';
import { computePermissionScopeHash, type ViewerScope } from '../permissions/scope-hash.js';
import { maskColumns } from '../permissions/column-mask.js';

const rows = [
  { id: 'row_1', createdTime: '2024-01-01T00:00:00Z', fields: { name: 'Alice', salary: 100_000, department: 'Eng' } },
  { id: 'row_2', createdTime: '2024-01-02T00:00:00Z', fields: { name: 'Bob', salary: 90_000, department: 'Design' } },
];

describe('computePermissionScopeHash', () => {
  it('produces different hashes for different visibleColumnIds', () => {
    const adminScope: ViewerScope = {
      viewerId: 'u1', stackId: 'stk_1',
      visibleTableIds: ['tbl_1'], visibleViewIds: ['*'],
      visibleColumnIds: ['name', 'salary', 'department'],
    };
    const restrictedScope: ViewerScope = {
      viewerId: 'u2', stackId: 'stk_1',
      visibleTableIds: ['tbl_1'], visibleViewIds: ['*'],
      visibleColumnIds: ['name', 'department'],
    };
    expect(computePermissionScopeHash(adminScope)).not.toBe(
      computePermissionScopeHash(restrictedScope),
    );
  });

  it('is deterministic — same input produces same hash', () => {
    const scope: ViewerScope = {
      viewerId: 'u1', stackId: 'stk_1',
      visibleTableIds: ['tbl_1'], visibleViewIds: ['*'],
      visibleColumnIds: ['name', 'salary'],
    };
    expect(computePermissionScopeHash(scope)).toBe(computePermissionScopeHash(scope));
  });

  it('is order-independent for column arrays', () => {
    const a: ViewerScope = {
      viewerId: 'u1', stackId: 'stk_1',
      visibleTableIds: ['tbl_1'], visibleViewIds: [],
      visibleColumnIds: ['salary', 'name'],
    };
    const b: ViewerScope = { ...a, visibleColumnIds: ['name', 'salary'] };
    expect(computePermissionScopeHash(a)).toBe(computePermissionScopeHash(b));
  });
});

describe('maskColumns', () => {
  it('returns all rows unchanged when visibleColumnIds is ["*"]', () => {
    const scope: ViewerScope = {
      viewerId: 'u1', stackId: 'stk_1',
      visibleTableIds: ['*'], visibleViewIds: ['*'],
      visibleColumnIds: ['*'],
    };
    const result = maskColumns(rows, scope);
    expect(result[0]!.fields).toHaveProperty('salary');
    expect(result[0]!.fields).toHaveProperty('department');
  });

  it('strips hidden columns from every row', () => {
    const scope: ViewerScope = {
      viewerId: 'u2', stackId: 'stk_1',
      visibleTableIds: ['tbl_1'], visibleViewIds: [],
      visibleColumnIds: ['name', 'department'],
    };
    const result = maskColumns(rows, scope);
    expect(result[0]!.fields).toHaveProperty('name');
    expect(result[0]!.fields).toHaveProperty('department');
    // salary must be completely absent — not null, not undefined
    expect('salary' in result[0]!.fields).toBe(false);
    expect('salary' in result[1]!.fields).toBe(false);
  });

  it('returns empty fields when no visible columns match', () => {
    const scope: ViewerScope = {
      viewerId: 'u3', stackId: 'stk_1',
      visibleTableIds: [], visibleViewIds: [],
      visibleColumnIds: ['col_nonexistent'],
    };
    const result = maskColumns(rows, scope);
    expect(Object.keys(result[0]!.fields)).toHaveLength(0);
  });
});
