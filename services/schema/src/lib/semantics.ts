import type { SchemaTable, SchemaColumn } from './introspect.js';

export interface ColumnInference {
  columnId: string;
  columnName: string;
  confidence: number;
  basis: string;
}

export interface SemanticTableProfile {
  tableId: string;
  tableName: string;
  displayColumn?: ColumnInference;
  statusColumn?: ColumnInference;
  dateColumns: ColumnInference[];
  ownerColumn?: ColumnInference;
  imageColumn?: ColumnInference;
  measures: ColumnInference[];
  naturalGroupings: ColumnInference[];
}

export interface SemanticProfile {
  stackId: string;
  tables: SemanticTableProfile[];
  profiledAt: string;
}

const LIFECYCLE_TERMS = new Set([
  'todo', 'to do', 'backlog', 'open', 'new',
  'in progress', 'in-progress', 'doing', 'active', 'wip',
  'review', 'in review', 'pending', 'blocked',
  'done', 'complete', 'completed', 'closed', 'resolved', 'shipped', 'archived',
]);

const DATE_NAME_PRIORITY = [
  'due', 'deadline', 'due date', 'end date', 'end',
  'start', 'start date', 'begin',
  'created', 'created at', 'created time',
  'modified', 'last modified', 'updated',
];

const PII_NAMES = new Set([
  'email', 'e-mail', 'phone', 'mobile', 'cell',
  'ssn', 'dob', 'date of birth', 'birthday', 'passport',
  'address', 'street', 'zip', 'postal', 'national id',
]);

export function isPiiColumn(col: SchemaColumn): boolean {
  const lower = col.name.toLowerCase();
  if (PII_NAMES.has(lower)) return true;
  if (col.type === 'email' || col.type === 'phone') return true;
  return false;
}

function datePriority(name: string): number {
  const lower = name.toLowerCase();
  const idx = DATE_NAME_PRIORITY.findIndex((term) => lower.includes(term));
  return idx === -1 ? DATE_NAME_PRIORITY.length : idx;
}

function isLifecycleSelect(col: SchemaColumn): boolean {
  if (col.type !== 'select' && col.type !== 'multiSelect') return false;
  const choices = (col.options?.['choices'] ?? []) as Array<{ name: string }>;
  if (choices.length < 2 || choices.length > 10) return false;
  const matchCount = choices.filter((c) => LIFECYCLE_TERMS.has(c.name.toLowerCase())).length;
  return matchCount / choices.length >= 0.5;
}

function profileTable(table: SchemaTable): SemanticTableProfile {
  const cols = table.columns;

  const primaryCol = cols.find((c) => c.isPrimary);
  const displayColumn: ColumnInference | undefined = primaryCol
    ? { columnId: primaryCol.id, columnName: primaryCol.name, confidence: 0.95, basis: 'primary column' }
    : (() => {
        const c = cols.find((x) => x.type === 'text');
        return c
          ? { columnId: c.id, columnName: c.name, confidence: 0.6, basis: 'first text column' }
          : undefined;
      })();

  const statusCandidates = cols
    .filter(isLifecycleSelect)
    .sort((a, b) => {
      const aScore = a.name.toLowerCase().includes('status') || a.name.toLowerCase().includes('state') ? 1 : 0;
      const bScore = b.name.toLowerCase().includes('status') || b.name.toLowerCase().includes('state') ? 1 : 0;
      return bScore - aScore;
    });
  const statusCol = statusCandidates[0];
  const statusColumn: ColumnInference | undefined = statusCol
    ? {
        columnId: statusCol.id,
        columnName: statusCol.name,
        confidence: statusCol.name.toLowerCase().includes('status') ? 0.95 : 0.75,
        basis: 'select column with lifecycle-like options',
      }
    : undefined;

  const dateCols = cols
    .filter((c) => ['date', 'dateTime', 'createdTime', 'lastModifiedTime'].includes(c.type))
    .sort((a, b) => datePriority(a.name) - datePriority(b.name));
  const dateColumns: ColumnInference[] = dateCols.map((c) => ({
    columnId: c.id,
    columnName: c.name,
    confidence: datePriority(c.name) < 2 ? 0.9 : 0.7,
    basis: `${c.type} column, priority rank ${datePriority(c.name)}`,
  }));

  const OWNER_TERMS = ['owner', 'assignee', 'assigned', 'responsible', 'member', 'person'];
  const ownerByType = cols.find((c) => c.type === 'collaborator' || c.type === 'multiCollaborator');
  const ownerByName = cols.find(
    (c) => c.type === 'text' && OWNER_TERMS.some((t) => c.name.toLowerCase().includes(t)),
  );
  const ownerSrc = ownerByType ?? ownerByName;
  const ownerColumn: ColumnInference | undefined = ownerSrc
    ? {
        columnId: ownerSrc.id,
        columnName: ownerSrc.name,
        confidence: ownerByType ? 0.95 : 0.6,
        basis: ownerByType ? 'collaborator column type' : 'person-named text column',
      }
    : undefined;

  const imageCol = cols.find((c) => c.type === 'multipleAttachment');
  const imageColumn: ColumnInference | undefined = imageCol
    ? { columnId: imageCol.id, columnName: imageCol.name, confidence: 0.8, basis: 'attachment column' }
    : undefined;

  const MEASURE_TYPES = new Set(['number', 'currency', 'percent', 'duration', 'rollup', 'count', 'progress', 'rating']);
  const measures: ColumnInference[] = cols
    .filter((c) => MEASURE_TYPES.has(c.type))
    .map((c) => ({ columnId: c.id, columnName: c.name, confidence: 0.9, basis: `${c.type} column type` }));

  const naturalGroupings: ColumnInference[] = cols
    .filter((c) => {
      if (c.type === 'select' || c.type === 'multiSelect') {
        const choices = (c.options?.['choices'] ?? []) as Array<unknown>;
        return choices.length >= 2 && choices.length <= 15;
      }
      return c.type === 'link';
    })
    .map((c) => {
      const choiceCount = c.type === 'link'
        ? 0
        : ((c.options?.['choices'] ?? []) as Array<unknown>).length;
      return {
        columnId: c.id,
        columnName: c.name,
        confidence: c.type === 'link' ? 0.85 : 0.9,
        basis: c.type === 'link'
          ? 'linked table provides natural grouping'
          : `select with ${choiceCount} options`,
      };
    });

  return {
    tableId: table.id,
    tableName: table.name,
    ...(displayColumn ? { displayColumn } : {}),
    ...(statusColumn ? { statusColumn } : {}),
    dateColumns,
    ...(ownerColumn ? { ownerColumn } : {}),
    ...(imageColumn ? { imageColumn } : {}),
    measures,
    naturalGroupings,
  };
}

export function computeSemanticProfile(stackId: string, tables: SchemaTable[]): SemanticProfile {
  return {
    stackId,
    tables: tables.map(profileTable),
    profiledAt: new Date().toISOString(),
  };
}
