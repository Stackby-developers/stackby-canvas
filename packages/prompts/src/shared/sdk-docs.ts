export const SDK_DOCS = `SDK REFERENCE (@stackby/studio-sdk):

import { useRecords, useMutation, useCurrentUser, useAggregate } from '@stackby/studio-sdk';

// useRecords — fetch rows from a table
const { data: tasks, isLoading, isEmpty, isPermissionDenied, isTruncated, meta, refetch } = useRecords(tableId, {
  view?: string,
  filter?: FilterCondition,  // { column, op, value } | { and: [...] } | { or: [...] }
  sort?: [{ columnId, direction: 'asc'|'desc' }],
  columns?: string[],
  page?: number,
  bindingId?: string,
});

// Filter operators: is | isNot | contains | doesNotContain | isEmpty | isNotEmpty
//                  gt | gte | lt | lte | before | after | onOrBefore | onOrAfter
//                  within | linkedTo | anyOf | allOf
// Relative dates: 'today' | 'yesterday' | 'thisWeek' | 'thisMonth' | 'thisYear'
//                 { lastNDays: n }

// useMutation — create, update, or delete rows with optimistic updates
const { mutate, mutateAsync, isLoading: isMutating, error } = useMutation(tableId, 'update');
mutate({ id: 'row_id', fields: { Status: 'Done' } }); // single select: pass name string

// useAggregate — server-side aggregation (never fetches raw rows)
const { groups } = useAggregate(tableId, {
  groupBy: ['Status'],
  metrics: [{ fn: 'count' }, { fn: 'sum', column: 'Hours' }],
});

// HookResult shape (all hooks):
// { data, isLoading, isFetching, error, isPermissionDenied, isEmpty, isTruncated, meta, refetch }

// REQUIRED: every data-bound component must handle all four states:
if (isLoading) return <LoadingState />;
if (isPermissionDenied) return <PermissionDeniedState />;
if (isEmpty) return <EmptyState />;
// then render data`;
