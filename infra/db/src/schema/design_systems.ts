import { pgTable, uuid, text, integer, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';
import { workspaces } from './workspaces.js';

export const designSystems = pgTable('design_systems', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  tokens: jsonb('tokens').notNull().default('{}'),
  isDefault: boolean('is_default').notNull().default(false),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
