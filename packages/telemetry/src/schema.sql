-- ClickHouse schema for Stackby Studio telemetry

CREATE DATABASE IF NOT EXISTS studio;

CREATE TABLE IF NOT EXISTS studio.run_steps (
  run_id        String,
  project_id    String,
  step_name     String,
  model_id      String,
  tokens_in     UInt32,
  tokens_out    UInt32,
  cached_tokens UInt32,
  latency_ms    UInt32,
  cost_usd      Float32,
  outcome       LowCardinality(String),
  error_message String DEFAULT '',
  created_at    DateTime
) ENGINE = MergeTree()
  PARTITION BY toYYYYMM(created_at)
  ORDER BY (run_id, step_name, created_at)
  TTL created_at + INTERVAL 1 YEAR;

CREATE TABLE IF NOT EXISTS studio.credit_events (
  workspace_id String,
  run_id       String DEFAULT '',
  amount       Int32,
  reason       String,
  created_at   DateTime
) ENGINE = MergeTree()
  PARTITION BY toYYYYMM(created_at)
  ORDER BY (workspace_id, created_at)
  TTL created_at + INTERVAL 2 YEAR;

CREATE TABLE IF NOT EXISTS studio.artifact_views (
  artifact_id  String,
  workspace_id String,
  viewer_id    String DEFAULT '',
  created_at   DateTime
) ENGINE = MergeTree()
  PARTITION BY toYYYYMM(created_at)
  ORDER BY (artifact_id, created_at)
  TTL created_at + INTERVAL 90 DAY;

CREATE MATERIALIZED VIEW IF NOT EXISTS studio.run_steps_daily
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(day)
ORDER BY (day, step_name, outcome)
POPULATE AS
  SELECT
    toDate(created_at) AS day,
    step_name,
    outcome,
    count() AS calls,
    sum(tokens_in) AS total_tokens_in,
    sum(tokens_out) AS total_tokens_out,
    sum(cost_usd) AS total_cost_usd,
    avg(latency_ms) AS avg_latency_ms
  FROM studio.run_steps
  GROUP BY day, step_name, outcome;
