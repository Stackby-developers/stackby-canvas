// Seed script — run with: tsx infra/db/seed.ts
import { db, workspaces, templates } from './src/index.js';

await db.insert(workspaces).values({
  name: 'Demo Workspace',
  slug: 'demo',
  plan: 'pro',
  creditBalance: 500,
});

await db.insert(templates).values([
  {
    name: 'Project Tracker',
    description: 'Track tasks, milestones, and team assignments.',
    artifactType: 'dashboard',
    tags: ['project', 'task', 'team'],
  },
  {
    name: 'CRM Dashboard',
    description: 'Visualise contacts, deals, and pipeline stages.',
    artifactType: 'dashboard',
    tags: ['crm', 'sales', 'contact'],
  },
  {
    name: 'Invoice Portal',
    description: 'Client-facing portal for viewing and downloading invoices.',
    artifactType: 'portal',
    tags: ['invoice', 'finance', 'client'],
  },
]);

console.warn('Seed complete');
process.exit(0);
