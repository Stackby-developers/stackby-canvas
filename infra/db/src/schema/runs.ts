import { pgTable, uuid, text, integer, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { projects } from './projects.js';
import { workspaces } from './workspaces.js';

export const runStatusEnum = pgEnum('run_status', [
  'pending',
  'intent',
  'schema',
  'clarification',
  'plan_review',
  'building',
  'verifying',
  'fixing',
  'ready',
  'failed',
]);

export const runs = pgTable('runs', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  prompt: text('prompt').notNull(),
  status: runStatusEnum('status').notNull().default('pending'),
  plan: jsonb('plan'),
  creditsUsed: integer('credits_used').notNull().default(0),
  modelTiersUsed: text('model_tiers_used').array(),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
});
