// @stackby/studio-sdk — public React hooks for generated artifacts
// Full implementation lives in lib/stackby-hooks.tsx in generated workspaces.
// This package exports the type contracts that generated code depends on.

export type {
  StackbySchemaGraph,
  SemanticProfile,
  ArtifactType,
  DataBinding,
} from '@stackby/schema-types';

export interface UseRowsOptions {
  stackId?: string;
  columns?: string[];
  viewId?: string;
}

export const SDK_VERSION = '0.0.1';
