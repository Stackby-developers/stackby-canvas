-- 0004_webhooks.sql — Webhook subscriptions for partner integrations (Zapier, Make)

BEGIN;

CREATE TABLE webhook_subscriptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  url           TEXT NOT NULL,
  events        TEXT[] NOT NULL,  -- e.g. {'artifact.published','run.completed'}
  secret        TEXT NOT NULL,    -- HMAC-SHA256 signing secret (returned once at creation)
  description   TEXT,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_by    UUID NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_fired_at TIMESTAMPTZ,
  failure_count INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE webhook_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY webhook_subscriptions_isolation ON webhook_subscriptions
  USING (workspace_id = (current_setting('app.current_workspace_id', true))::uuid);
CREATE INDEX webhook_subscriptions_workspace_idx ON webhook_subscriptions(workspace_id);
CREATE INDEX webhook_subscriptions_events_idx    ON webhook_subscriptions USING GIN(events);

-- Delivery log for debugging and SOC 2 evidence trail
CREATE TABLE webhook_deliveries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES webhook_subscriptions(id) ON DELETE CASCADE,
  event           TEXT NOT NULL,
  payload         JSONB NOT NULL,
  response_status INTEGER,
  response_body   TEXT,
  duration_ms     INTEGER,
  attempt         INTEGER NOT NULL DEFAULT 1,
  delivered_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success         BOOLEAN NOT NULL
);
CREATE INDEX webhook_deliveries_sub_idx ON webhook_deliveries(subscription_id, delivered_at DESC);

COMMIT;
