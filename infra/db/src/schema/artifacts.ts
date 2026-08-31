import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  pgEnum,
  boolean,
} from 'drizzle-orm/pg-core';
import { projects } from './projects.js';
import { workspaces } from './workspaces.js';
import { runs } from './runs.js';

export const artifactTypeEnum = pgEnum('artifact_type', [
  'dashboard',
  'portal',
  'report',
  'form',
  'gallery',
  'website',
  'document',
  'presentation',
]);

export const artifactStatusEnum = pgEnum('artifact_status', [
  'draft',
  'building',
  'ready',
  'published',
  'failed',
]);

export const artifacts = pgTable('artifacts', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  runId: uuid('run_id')
    .notNull()
    .references(() => runs.id),
  type: artifactTypeEnum('type').notNull(),
  status: artifactStatusEnum('status').notNull().default('draft'),
  currentVersionId: uuid('current_version_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const artifactVersions = pgTable('artifact_versions', {
  id: uuid('id').defaultRandom().primaryKey(),
  artifactId: uuid('artifact_id')
    .notNull()
    .references(() => artifacts.id, { onDelete: 'cascade' }),
  workspaceId: uuid('workspace_id').notNull(),
  versionNumber: integer('version_number').notNull(),
  files: jsonb('files').notNull(),
  buildHash: text('build_hash'),
  previewUrl: text('preview_url'),
  publishUrl: text('publish_url'),
  permissionScopeHash: text('permission_scope_hash'),
  isPublic: boolean('is_public').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
