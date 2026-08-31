import type { SchemaTable } from './introspect.js';
import type { DataBinding } from '@stackby/schema-types';

export type ChangeKind =
  | 'added_table'
  | 'removed_table'
  | 'added_column'
  | 'removed_column'
  | 'renamed_column'
  | 'retyped_column';

export interface SchemaChange {
  kind: ChangeKind;
  tableId: string;
  tableName: string;
  columnId?: string;
  oldColumnName?: string;
  newColumnName?: string;
  oldType?: string;
  newType?: string;
}

export interface AffectedBinding {
  bindingId: string;
  projectId: string;
  tableId: string;
  columnId: string;
  changeKind: ChangeKind;
}

export interface DriftResult {
  changes: SchemaChange[];
  affectedBindings: AffectedBinding[];
}

const BREAKING_KINDS = new Set<ChangeKind>([
  'removed_column',
  'renamed_column',
  'retyped_column',
  'removed_table',
]);

export function detectDrift(
  oldTables: SchemaTable[],
  newTables: SchemaTable[],
  bindings: DataBinding[],
): DriftResult {
  const changes: SchemaChange[] = [];
  const oldTableMap = new Map(oldTables.map((t) => [t.id, t]));
  const newTableMap = new Map(newTables.map((t) => [t.id, t]));

  for (const [id, old] of oldTableMap) {
    if (!newTableMap.has(id)) {
      changes.push({ kind: 'removed_table', tableId: id, tableName: old.name });
    }
  }

  for (const [id, nw] of newTableMap) {
    if (!oldTableMap.has(id)) {
      changes.push({ kind: 'added_table', tableId: id, tableName: nw.name });
    }
  }

  for (const [tableId, oldTable] of oldTableMap) {
    const newTable = newTableMap.get(tableId);
    if (!newTable) continue;

    const oldColMap = new Map(oldTable.columns.map((c) => [c.id, c]));
    const newColMap = new Map(newTable.columns.map((c) => [c.id, c]));

    for (const [colId, oldCol] of oldColMap) {
      const newCol = newColMap.get(colId);
      if (!newCol) {
        changes.push({
          kind: 'removed_column',
          tableId,
          tableName: oldTable.name,
          columnId: colId,
          oldColumnName: oldCol.name,
        });
        continue;
      }
      if (oldCol.name !== newCol.name) {
        changes.push({
          kind: 'renamed_column',
          tableId,
          tableName: oldTable.name,
          columnId: colId,
          oldColumnName: oldCol.name,
          newColumnName: newCol.name,
        });
      }
      if (oldCol.type !== newCol.type) {
        changes.push({
          kind: 'retyped_column',
          tableId,
          tableName: oldTable.name,
          columnId: colId,
          oldColumnName: oldCol.name,
          newColumnName: newCol.name,
          oldType: oldCol.type,
          newType: newCol.type,
        });
      }
    }

    for (const [colId, newCol] of newColMap) {
      if (!oldColMap.has(colId)) {
        changes.push({
          kind: 'added_column',
          tableId,
          tableName: newTable.name,
          columnId: colId,
          newColumnName: newCol.name,
        });
      }
    }
  }

  const breakingChanges = changes.filter((c) => BREAKING_KINDS.has(c.kind));
  const affectedBindings: AffectedBinding[] = [];

  for (const binding of bindings) {
    for (const change of breakingChanges) {
      if (change.tableId !== binding.tableId) continue;
      if (change.kind === 'removed_table') {
        affectedBindings.push({
          bindingId: binding.componentId,
          projectId: '',
          tableId: binding.tableId,
          columnId: '',
          changeKind: change.kind,
        });
      } else if (change.columnId && binding.columnIds.includes(change.columnId)) {
        affectedBindings.push({
          bindingId: binding.componentId,
          projectId: '',
          tableId: binding.tableId,
          columnId: change.columnId,
          changeKind: change.kind,
        });
      }
    }
  }

  return { changes, affectedBindings };
}
