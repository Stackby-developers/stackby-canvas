-- Migration 0005: stack allowlist column on workspace_policies
ALTER TABLE workspace_policies
  ADD COLUMN IF NOT EXISTS allowed_stack_ids TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN workspace_policies.allowed_stack_ids IS
  'Empty array = all stacks allowed. Non-empty = only listed stack IDs may be used in Studio.';
