import { pgTable, uuid, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { workspaces } from './workspaces.js';

export const projectStatusEnum = pgEnum('project_status', ['draft', 'published', 'archived']);

export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  stackId: text('stack_id').notNull(),
  designSystemId: uuid('design_system_id'),
  status: projectStatusEnum('status').notNull().default('draft'),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
