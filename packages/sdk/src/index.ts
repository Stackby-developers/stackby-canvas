// Provider + config
export { StackbyProvider } from './provider.js';
export type { StackbyConfig } from './internal/context.js';

// Hooks
export { useStack } from './hooks/use-stack.js';
export { useRecords } from './hooks/use-records.js';
export { useTable } from './hooks/use-table.js';
export type { UseRecordsOptions } from './hooks/use-records.js';
export { useRecord } from './hooks/use-record.js';
export { useLinkedRecords } from './hooks/use-linked-records.js';
export { useView } from './hooks/use-view.js';
export { useAggregate } from './hooks/use-aggregate.js';
export type {
  AggregateMetric,
  UseAggregateOptions,
  UseAggregateResult,
  AggregateGroup,
} from './hooks/use-aggregate.js';
export { useSearch } from './hooks/use-search.js';
export { useCurrentUser } from './hooks/use-current-user.js';
export type { CurrentUser, UseCurrentUserResult } from './hooks/use-current-user.js';
export { useMutation } from './hooks/use-mutation.js';
export type {
  MutationOp,
  MutationRecord,
  MutationResult,
  UseMutationResult,
} from './hooks/use-mutation.js';
export { useAttachmentUpload } from './hooks/use-attachment-upload.js';
export type {
  UploadResult,
  UseAttachmentUploadResult,
} from './hooks/use-attachment-upload.js';
export { useDeepLink } from './hooks/use-deep-link.js';
export type { UseDeepLinkOptions, UseDeepLinkResult } from './hooks/use-deep-link.js';

// Dev overlay
export { DataInspector } from './components/data-inspector.js';

// Standalone client
export { StackbyStudioClient } from './client.js';
export type { GetRecordsOptions } from './client.js';

// Filter DSL
export type {
  FilterCondition,
  FilterOp,
  FilterValue,
  RelativeDate,
  LastNDays,
  LeafCondition,
  AndCondition,
  OrCondition,
} from './filter/types.js';
export { validateFilter, FilterConditionSchema } from './filter/validate.js';
export { serializeFilter } from './filter/serialize.js';

// Common result type
export type { HookResult, HookMeta } from './internal/result.js';
