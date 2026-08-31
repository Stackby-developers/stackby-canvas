-- 0001_initial.sql — Stackby Studio initial schema

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE plan AS ENUM ('free', 'pro', 'team', 'enterprise');
CREATE TYPE member_role AS ENUM ('owner', 'admin', 'editor', 'viewer');
CREATE TYPE project_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE run_status AS ENUM (
  'pending', 'intent', 'schema', 'clarification', 'plan_review',
  'building', 'verifying', 'fixing', 'ready', 'failed'
);
CREATE TYPE artifact_type AS ENUM (
  'dashboard', 'portal', 'report', 'form', 'gallery', 'website', 'document', 'presentation'
);
CREATE TYPE artifact_status AS ENUM ('draft', 'building', 'ready', 'published', 'failed');

-- workspaces (not RLS-protected — readable by auth layer)
CREATE TABLE workspaces (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  plan            plan NOT NULL DEFAULT 'free',
  credit_balance  INTEGER NOT NULL DEFAULT 50,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- workspace_members
CREATE TABLE workspace_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL,
  role          member_role NOT NULL DEFAULT 'viewer',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, user_id)
);
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY workspace_members_isolation ON workspace_members
  USING (workspace_id = (current_setting('app.current_workspace_id', true))::uuid);

-- projects
CREATE TABLE projects (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  stack_id          TEXT NOT NULL,
  design_system_id  UUID,
  status            project_status NOT NULL DEFAULT 'draft',
  created_by        UUID NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY projects_isolation ON projects
  USING (workspace_id = (current_setting('app.current_workspace_id', true))::uuid);
CREATE INDEX projects_workspace_id_idx ON projects(workspace_id);

-- runs
CREATE TABLE runs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  workspace_id      UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  prompt            TEXT NOT NULL,
  status            run_status NOT NULL DEFAULT 'pending',
  plan              JSONB,
  credits_used      INTEGER NOT NULL DEFAULT 0,
  model_tiers_used  TEXT[],
  started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at      TIMESTAMPTZ
);
ALTER TABLE runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY runs_isolation ON runs
  USING (workspace_id = (current_setting('app.current_workspace_id', true))::uuid);
CREATE INDEX runs_workspace_id_idx ON runs(workspace_id);
CREATE INDEX runs_project_id_idx ON runs(project_id);

-- artifacts
CREATE TABLE artifacts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  workspace_id        UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  run_id              UUID NOT NULL REFERENCES runs(id),
  type                artifact_type NOT NULL,
  status              artifact_status NOT NULL DEFAULT 'draft',
  current_version_id  UUID,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE artifacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY artifacts_isolation ON artifacts
  USING (workspace_id = (current_setting('app.current_workspace_id', true))::uuid);
CREATE INDEX artifacts_workspace_id_idx ON artifacts(workspace_id);

-- artifact_versions
CREATE TABLE artifact_versions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id            UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
  workspace_id           UUID NOT NULL,
  version_number         INTEGER NOT NULL,
  files                  JSONB NOT NULL DEFAULT '[]',
  build_hash             TEXT,
  preview_url            TEXT,
  publish_url            TEXT,
  permission_scope_hash  TEXT,
  is_public              BOOLEAN NOT NULL DEFAULT false,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (artifact_id, version_number)
);
ALTER TABLE artifact_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY artifact_versions_isolation ON artifact_versions
  USING (workspace_id = (current_setting('app.current_workspace_id', true))::uuid);

-- design_systems
CREATE TABLE design_systems (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  tokens        JSONB NOT NULL DEFAULT '{}',
  is_default    BOOLEAN NOT NULL DEFAULT false,
  version       INTEGER NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE design_systems ENABLE ROW LEVEL SECURITY;
CREATE POLICY design_systems_isolation ON design_systems
  USING (workspace_id = (current_setting('app.current_workspace_id', true))::uuid);

-- templates (global — no RLS needed)
CREATE TABLE templates (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  description    TEXT NOT NULL DEFAULT '',
  artifact_type  artifact_type NOT NULL,
  thumbnail_url  TEXT,
  demo_url       TEXT,
  stack_seed     JSONB NOT NULL DEFAULT '{}',
  tags           TEXT[] NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- credit_ledger
CREATE TABLE credit_ledger (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  run_id        UUID REFERENCES runs(id),
  amount        INTEGER NOT NULL,
  reason        TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE credit_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY credit_ledger_isolation ON credit_ledger
  USING (workspace_id = (current_setting('app.current_workspace_id', true))::uuid);
CREATE INDEX credit_ledger_workspace_id_idx ON credit_ledger(workspace_id);

-- audit_log
CREATE TABLE audit_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   UUID NOT NULL,
  actor_id       UUID NOT NULL,
  action         TEXT NOT NULL,
  resource_type  TEXT NOT NULL,
  resource_id    UUID,
  metadata       JSONB NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_log_isolation ON audit_log
  USING (workspace_id = (current_setting('app.current_workspace_id', true))::uuid);
CREATE INDEX audit_log_workspace_id_idx ON audit_log(workspace_id);

COMMIT;
