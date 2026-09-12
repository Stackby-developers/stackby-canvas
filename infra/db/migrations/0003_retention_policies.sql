-- 0003_retention_policies.sql — SOC 2 data retention

BEGIN;

-- Workspace-configurable retention periods per data type.
-- When no row exists for a workspace, the system defaults apply.
CREATE TABLE retention_policies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  data_type       TEXT NOT NULL CHECK (data_type IN ('runs', 'audit_log', 'artifacts', 'credit_ledger')),
  retention_days  INTEGER NOT NULL CHECK (retention_days >= 30),
  updated_by      UUID NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, data_type)
);

ALTER TABLE retention_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY retention_policies_isolation ON retention_policies
  USING (workspace_id = (current_setting('app.current_workspace_id', true))::uuid);

-- System-wide defaults (no workspace_id — readable by the retention job without RLS).
-- SOC 2 CC9.1: data is disposed of in accordance with documented policy.
CREATE TABLE system_retention_defaults (
  data_type       TEXT PRIMARY KEY,
  retention_days  INTEGER NOT NULL,
  anonymise       BOOLEAN NOT NULL DEFAULT FALSE  -- true = anonymise instead of hard-delete
);

INSERT INTO system_retention_defaults (data_type, retention_days, anonymise) VALUES
  ('runs',           90,   FALSE),  -- build artefacts pruned after 90 days
  ('artifacts',     365,   FALSE),  -- unpublished artifact files after 1 year
  ('credit_ledger', 2555,  TRUE),   -- 7 years, then anonymise (regulatory)
  ('audit_log',     2555,  FALSE)   -- 7 years hard-retain (SOC 2 min 1y, we keep 7y)
ON CONFLICT DO NOTHING;

-- Partial indexes to speed up nightly retention sweeps.
CREATE INDEX runs_created_at_idx        ON runs(created_at)            WHERE status IN ('ready','failed');
CREATE INDEX artifacts_updated_at_idx   ON artifact_versions(created_at);
CREATE INDEX credit_ledger_created_idx  ON credit_ledger(created_at);
-- audit_log already has created_at; add partial index for old entries
CREATE INDEX audit_log_old_idx          ON audit_log(created_at)       WHERE created_at < NOW() - INTERVAL '1 year';

-- Track retention job runs for SOC 2 evidence.
CREATE TABLE retention_job_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_type    TEXT NOT NULL,
  rows_deleted INTEGER NOT NULL DEFAULT 0,
  rows_anonymised INTEGER NOT NULL DEFAULT 0,
  duration_ms  INTEGER,
  error        TEXT
);

COMMIT;
