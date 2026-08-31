import { describe, it, expect, beforeEach } from 'vitest';
import { BindingRegistry } from '../bindings/registry.js';
import { createMockRedis } from './mock-redis.js';
import type { DataBinding } from '@stackby/schema-types';

let registry: BindingRegistry;
let mockRedis: ReturnType<typeof createMockRedis>;

beforeEach(() => {
  mockRedis = createMockRedis();
  registry = new BindingRegistry(mockRedis as never);
});

const binding: DataBinding = {
  componentId: 'cmp_1',
  tableId: 'tbl_tasks',
  tableName: 'Tasks',
  columnIds: ['col_name', 'col_status', 'col_assignee'],
};

describe('BindingRegistry', () => {
  it('Studio session (artifactId=null) always passes', async () => {
    const result = await registry.validate(null, 'tbl_tasks', ['col_name']);
    expect(result.componentId).toBe('__studio__');
  });

  it('passes for a registered binding matching tableId and all columnIds', async () => {
    await registry.register('art_1', [binding]);
    const result = await registry.validate('art_1', 'tbl_tasks', ['col_name', 'col_status']);
    expect(result.componentId).toBe('cmp_1');
  });

  it('passes when columnIds is empty (any table access)', async () => {
    await registry.register('art_1', [binding]);
    const result = await registry.validate('art_1', 'tbl_tasks', []);
    expect(result.componentId).toBe('cmp_1');
  });

  it('throws 403 BINDING_NOT_DECLARED for wrong tableId', async () => {
    await registry.register('art_1', [binding]);
    await expect(
      registry.validate('art_1', 'tbl_projects', ['col_name']),
    ).rejects.toMatchObject({ statusCode: 403, code: 'BINDING_NOT_DECLARED' });
  });

  it('throws 403 BINDING_NOT_DECLARED for undeclared column', async () => {
    await registry.register('art_1', [binding]);
    await expect(
      registry.validate('art_1', 'tbl_tasks', ['col_salary']),
    ).rejects.toMatchObject({ statusCode: 403, code: 'BINDING_NOT_DECLARED' });
  });

  it('throws 403 BINDING_NOT_DECLARED when no bindings registered for artifactId', async () => {
    await expect(
      registry.validate('art_missing', 'tbl_tasks', ['col_name']),
    ).rejects.toMatchObject({ statusCode: 403, code: 'BINDING_NOT_DECLARED' });
  });

  it('allows wildcard column access with c === "*"', async () => {
    await registry.register('art_1', [binding]);
    const result = await registry.validate('art_1', 'tbl_tasks', ['*']);
    expect(result).toBeDefined();
  });
});
