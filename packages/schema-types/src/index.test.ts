import { describe, it, expect } from 'vitest';
import {
  StackbySchemaGraphSchema,
  DataBindingSchema,
  FileOperationSchema,
  RunEventSchema,
  ArtifactTypeSchema,
  StudioErrorSchema,
  READ_ONLY_COLUMN_TYPES,
} from './index.js';

describe('schema-types smoke tests', () => {
  it('ArtifactTypeSchema parses all variants', () => {
    expect(ArtifactTypeSchema.parse('dashboard')).toBe('dashboard');
    expect(ArtifactTypeSchema.parse('portal')).toBe('portal');
  });

  it('StudioErrorSchema validates correctly', () => {
    const err = StudioErrorSchema.parse({
      code: 'INTERNAL',
      message: 'internal error',
      httpStatus: 500,
      retryable: false,
      userMessage: 'Something went wrong',
    });
    expect(err.retryable).toBe(false);
  });

  it('FileOperationSchema discriminates on op', () => {
    const write = FileOperationSchema.parse({ op: 'write', path: '/foo.ts', content: 'hello' });
    expect(write.op).toBe('write');
    const del = FileOperationSchema.parse({ op: 'delete', path: '/foo.ts' });
    expect(del.op).toBe('delete');
  });

  it('RunEventSchema parses ready event', () => {
    const ev = RunEventSchema.parse({
      type: 'ready',
      runId: '00000000-0000-0000-0000-000000000001',
      ts: Date.now(),
      data: { previewUrl: 'https://preview.stackby.com/abc' },
    });
    expect(ev.type).toBe('ready');
  });

  it('READ_ONLY_COLUMN_TYPES includes formula', () => {
    expect(READ_ONLY_COLUMN_TYPES.has('formula')).toBe(true);
    expect(READ_ONLY_COLUMN_TYPES.has('text')).toBe(false);
  });

  it('StackbySchemaGraphSchema validates a minimal stack', () => {
    const graph = StackbySchemaGraphSchema.parse({
      stackId: 'stk_1',
      stackName: 'My Stack',
      tables: [
        {
          id: 'tbl_1',
          name: 'Tasks',
          primaryColumnId: 'col_1',
          columns: [{ id: 'col_1', name: 'Name', type: 'text' }],
        },
      ],
      fetchedAt: new Date().toISOString(),
    });
    expect(graph.tables).toHaveLength(1);
  });

  it('DataBindingSchema validates a binding', () => {
    const binding = DataBindingSchema.parse({
      componentId: 'cmp_1',
      tableId: 'tbl_1',
      tableName: 'Tasks',
      columnIds: ['col_1', 'col_2'],
    });
    expect(binding.columnIds).toHaveLength(2);
  });
});
