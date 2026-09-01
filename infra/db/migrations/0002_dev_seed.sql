-- Dev seed: stable workspace + member for local development
-- Safe to re-run: ON CONFLICT DO NOTHING
INSERT INTO workspaces (id, name, slug, plan, credit_balance)
VALUES ('00000000-0000-0000-0000-000000000001', 'Dev Workspace', 'dev', 'pro', 10000)
ON CONFLICT (id) DO NOTHING;

INSERT INTO workspace_members (id, workspace_id, user_id, role)
VALUES (
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  'owner'
) ON CONFLICT DO NOTHING;
