import { describe, it, expect } from 'vitest';
import { generateReadme } from '../readme/generator.js';
import type { DataBinding } from '@stackby/schema-types';

const BINDINGS: DataBinding[] = [
  { componentId: 'TaskList', tableId: 'tbl_tasks', tableName: 'Tasks', columnIds: ['Name', 'Status', 'DueDate'] },
  { componentId: 'TaskDetail', tableId: 'tbl_tasks', tableName: 'Tasks', columnIds: [] },
];

const readme = generateReadme({
  artifactName: 'Task Dashboard',
  artifactType: 'dashboard',
  description: 'A real-time task tracker connected to Stackby.',
  stackId: 'stk_abc123',
  stackName: 'My Tasks',
  bindings: BINDINGS,
  sdkVersion: '0.1.0',
  repoName: 'task-dashboard',
});

describe('README generator', () => {
  it('contains the artifact name as H1', () => {
    expect(readme).toMatch(/^# Task Dashboard/m);
  });

  it('contains architecture section with SDK version', () => {
    expect(readme).toContain('## Architecture');
    expect(readme).toContain('@stackby/studio-sdk@0.1.0');
  });

  it('contains data bindings table', () => {
    expect(readme).toContain('## Data bindings');
    expect(readme).toContain('TaskList');
    expect(readme).toContain('Tasks');
    expect(readme).toContain('Name, Status, DueDate');
  });

  it('TaskDetail with empty columnIds shows (all)', () => {
    expect(readme).toContain('(all)');
  });

  it('contains environment variables section', () => {
    expect(readme).toContain('## Environment variables');
    expect(readme).toContain('STACKBY_STACK_ID');
    expect(readme).toContain('STACKBY_API_KEY');
  });

  it('contains local dev steps with pnpm', () => {
    expect(readme).toContain('pnpm install');
    expect(readme).toContain('pnpm dev');
  });

  it('contains deployment steps (Vercel)', () => {
    expect(readme).toContain('## Deployment');
    expect(readme).toContain('Vercel');
  });

  it('pins the SDK version in dependencies section', () => {
    expect(readme).toContain('studio-sdk');
    expect(readme).toContain('0.1.0');
  });

  it('does not contain placeholder text like TODO or FIXME', () => {
    expect(readme.toLowerCase()).not.toContain('todo');
    expect(readme.toLowerCase()).not.toContain('fixme');
  });

  it('empty bindings → no binding table rows', () => {
    const noBindings = generateReadme({ ...{ artifactName: 'A', artifactType: 'dashboard', description: 'D', stackId: 'stk', stackName: 'S', bindings: [], sdkVersion: '1.0.0', repoName: 'r' } });
    expect(noBindings).toContain('No data bindings declared');
  });
});
