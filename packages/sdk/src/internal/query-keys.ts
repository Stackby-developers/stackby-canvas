export const queryKeys = {
  records: (stackId: string, tableId: string, opts: object) =>
    ['stackby', 'records', stackId, tableId, opts] as const,

  record: (stackId: string, tableId: string, recordId: string) =>
    ['stackby', 'record', stackId, tableId, recordId] as const,

  linkedRecords: (stackId: string, tableId: string, recordId: string, column: string) =>
    ['stackby', 'linked', stackId, tableId, recordId, column] as const,

  aggregate: (stackId: string, tableId: string, opts: object) =>
    ['stackby', 'aggregate', stackId, tableId, opts] as const,

  currentUser: (stackId: string) => ['stackby', 'me', stackId] as const,
};
