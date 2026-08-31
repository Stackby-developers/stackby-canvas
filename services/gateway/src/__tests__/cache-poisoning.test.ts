/**
 * CRITICAL ISOLATION TEST — cache poisoning prevention.
 *
 * Two viewers with different permissions issue the identical logical query.
 * Assert: different cache keys, correct per-viewer column visibility.
 */
import { describe, it, expect } from 'vitest';
import { computePermissionScopeHash, type ViewerScope } from '../permissions/scope-hash.js';
import { buildCacheKey } from '../cache/key.js';
import { shapeRows } from '../query/shape.js';

// Upstream rows contain salary — must only reach Viewer A, not B
const upstreamRows = [
  { id: 'row_1', createdTime: '2024-01-01T00:00:00Z', fields: { id: 'r1', name: 'Alice', salary: 150_000 } },
  { id: 'row_2', createdTime: '2024-01-01T00:00:00Z', fields: { id: 'r2', name: 'Bob', salary: 120_000 } },
];

const scopeA: ViewerScope = {
  viewerId: 'viewer_a',
  stackId: 'stk_1',
  visibleTableIds: ['tbl_employees'],
  visibleViewIds: ['*'],
  visibleColumnIds: ['id', 'name', 'salary'], // admin — sees salary
};

const scopeB: ViewerScope = {
  viewerId: 'viewer_b',
  stackId: 'stk_1',
  visibleTableIds: ['tbl_employees'],
  visibleViewIds: ['*'],
  visibleColumnIds: ['id', 'name'], // restricted — salary hidden
};

describe('Cache poisoning prevention', () => {
  it('Viewer A and B produce DIFFERENT cache keys', () => {
    const hashA = computePermissionScopeHash(scopeA);
    const hashB = computePermissionScopeHash(scopeB);
    expect(hashA).not.toBe(hashB);

    const keyA = buildCacheKey({ stackId: 'stk_1', tableId: 'tbl_employees', columns: [], page: 1, permissionScopeHash: hashA });
    const keyB = buildCacheKey({ stackId: 'stk_1', tableId: 'tbl_employees', columns: [], page: 1, permissionScopeHash: hashB });
    expect(keyA).not.toBe(keyB);
  });

  it('Viewer A sees salary', () => {
    const shaped = shapeRows(upstreamRows, scopeA);
    expect(shaped[0]!.fields).toHaveProperty('salary');
    expect(shaped[0]!.fields['salary']).toBe(150_000);
  });

  it('Viewer B NEVER sees salary — even after Viewer A populates their cache', () => {
    // Simulate: Viewer A already fetched and cached rows (containing salary).
    // Viewer B reads from the same cache shard — but because cache keys differ,
    // this never happens. We test the masking pipeline to prove correctness.
    const shapedB = shapeRows(upstreamRows, scopeB);

    // salary must be completely absent — not just null
    expect('salary' in (shapedB[0]?.fields ?? {})).toBe(false);
    expect('salary' in (shapedB[1]?.fields ?? {})).toBe(false);
  });

  it('Viewer B can still see permitted fields', () => {
    const shapedB = shapeRows(upstreamRows, scopeB);
    expect(shapedB[0]!.fields['name']).toBe('Alice');
    expect(shapedB[1]!.fields['name']).toBe('Bob');
  });

  it('Cache key includes permissionScopeHash — removing it would collapse scopes', () => {
    // If we build a key WITHOUT psh, both viewers would share the same key
    const keyWithout = buildCacheKey({
      stackId: 'stk_1', tableId: 'tbl_employees', columns: [], page: 1,
      permissionScopeHash: '', // deliberately empty
    });
    const keyA = buildCacheKey({
      stackId: 'stk_1', tableId: 'tbl_employees', columns: [], page: 1,
      permissionScopeHash: computePermissionScopeHash(scopeA),
    });
    const keyB = buildCacheKey({
      stackId: 'stk_1', tableId: 'tbl_employees', columns: [], page: 1,
      permissionScopeHash: computePermissionScopeHash(scopeB),
    });
    // All three are different — the psh discriminates
    expect(keyWithout).not.toBe(keyA);
    expect(keyWithout).not.toBe(keyB);
    expect(keyA).not.toBe(keyB);
  });
});
