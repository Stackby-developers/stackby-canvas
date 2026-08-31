import { pgTable, uuid, text, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { artifactTypeEnum } from './artifacts.js';

export const templates = pgTable('templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  artifactType: artifactTypeEnum('artifact_type').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  demoUrl: text('demo_url'),
  stackSeed: jsonb('stack_seed').notNull().default('{}'),
  tags: text('tags').array().notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
