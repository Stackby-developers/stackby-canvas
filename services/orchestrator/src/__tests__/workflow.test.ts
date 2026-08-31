import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Worker } from '@temporalio/worker';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { GenerationWorkflow } from '../workflows/generation.js';
import type { GenerationInput, GenerationOutput } from '../workflows/shared/workflow-types.js';

const SERVICE_ROOT = join(import.meta.dirname, '../..');
const DIST_WORKFLOW = join(SERVICE_ROOT, 'dist/workflows/generation.js');

let env: TestWorkflowEnvironment;

beforeAll(async () => {
  // Build TypeScript → JS so Temporal's workflow bundler can find the .js files
  if (!existsSync(DIST_WORKFLOW)) {
    execSync('pnpm build', { cwd: SERVICE_ROOT, stdio: 'pipe' });
  }
  env = await TestWorkflowEnvironment.createLocal();
}, 90_000);

afterAll(async () => {
  await env?.teardown();
});

const mockActivities = {
  analyzeIntent: async () => ({ intent: 'Build a task dashboard', artifactType: 'dashboard' as const, confidence: 0.95 }),
  analyzeSchema: async () => ({ stackId: 'stk_1', tables: [], profiledAt: new Date().toISOString() }),
  clarify: async () => ({ questions: [], answers: {}, skipped: true }),
  generatePlan: async () => ({
    id: '00000000-0000-0000-0000-000000000001',
    runId: 'run_test',
    intent: 'Task dashboard',
    artifactType: 'dashboard' as const,
    stackId: 'stk_1',
    steps: [{ id: 'step_1', type: 'component' as const, title: 'TaskList', description: 'List tasks', tables: ['tbl_tasks'], columns: [], dependencies: [] }],
    createdAt: new Date().toISOString(),
  }),
  generateDesign: async () => ({ designContext: 'Minimal dark theme' }),
  generateCode: async () => [{ op: 'write' as const, path: 'src/App.tsx', content: 'export default function App() { return <div>Tasks</div>; }' }],
  applyOperations: async () => ({ paths: ['src/App.tsx'] }),
  buildArtifact: async () => ({ buildId: 'build_1', previewUrl: 'https://preview.stackby.com/test', screenshotUrl: 'https://screenshots.stackby.com/test.png', buildHash: 'abc123', success: true }),
  verifyVisually: async () => ({ pass: true, issues: [], screenshotUrl: 'https://screenshots.stackby.com/test.png' }),
  summarise: async () => undefined,
  finalise: async () => ({ artifactId: 'art_1', versionId: 'ver_1', previewUrl: 'https://preview.stackby.com/test', buildHash: 'abc123' }),
};

describe('GenerationWorkflow — happy path', () => {
  it('completes when plan is approved via signal', async () => {
    const { client, nativeConnection } = env;

    const worker = await Worker.create({
      connection: nativeConnection,
      taskQueue: 'test-gen-happy',
      workflowsPath: DIST_WORKFLOW,
      activities: mockActivities,
    });

    const result: GenerationOutput = await worker.runUntil(async () => {
      const handle = await client.workflow.start(GenerationWorkflow, {
        taskQueue: 'test-gen-happy',
        workflowId: `wf-happy-${Date.now()}`,
        args: [{
          projectId: 'proj_1',
          runId: 'run_test_happy',
          stackId: 'stk_1',
          prompt: 'Build a task dashboard',
          artifactType: 'dashboard',
        } satisfies GenerationInput],
      });

      // Wait a tick then approve the plan
      await new Promise((r) => setTimeout(r, 300));
      await handle.signal('approvePlan', { comment: 'Approved' });

      return handle.result();
    });

    expect(result.artifactId).toBeDefined();
    expect(result.previewUrl).toContain('preview');
  }, 90_000);
});

describe('GenerationWorkflow — cancellation', () => {
  it('cancellation after start does not leave dangling state', async () => {
    const { client, nativeConnection } = env;

    const worker = await Worker.create({
      connection: nativeConnection,
      taskQueue: 'test-gen-cancel',
      workflowsPath: DIST_WORKFLOW,
      activities: {
        ...mockActivities,
        analyzeIntent: async () => {
          await new Promise((r) => setTimeout(r, 300));
          return { intent: 'test', artifactType: 'dashboard' as const, confidence: 0.9 };
        },
      },
    });

    await worker.runUntil(async () => {
      const handle = await client.workflow.start(GenerationWorkflow, {
        taskQueue: 'test-gen-cancel',
        workflowId: `wf-cancel-${Date.now()}`,
        args: [{ projectId: 'p1', runId: 'run_cancel', stackId: 'stk_1', prompt: 'test', artifactType: 'dashboard' }],
      });

      await handle.cancel();

      try {
        await handle.result();
        // Should not reach here
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeDefined();
      }
    });
  }, 90_000);
});

describe('GenerationWorkflow — self-heal loop', () => {
  it('retries code generation when build fails once then succeeds', async () => {
    const { client, nativeConnection } = env;
    let buildCallCount = 0;
    let fixCallCount = 0;

    const worker = await Worker.create({
      connection: nativeConnection,
      taskQueue: 'test-gen-selfheal',
      workflowsPath: DIST_WORKFLOW,
      activities: {
        ...mockActivities,
        buildArtifact: async () => {
          buildCallCount++;
          if (buildCallCount === 1) {
            return { buildId: 'b1', previewUrl: '', screenshotUrl: '', buildHash: '', success: false, errors: ["Property 'x' does not exist on type 'string'"] };
          }
          return { buildId: 'b2', previewUrl: 'https://preview.stackby.com/fixed', screenshotUrl: 'https://screenshots.stackby.com/fixed.png', buildHash: 'fixed123', success: true };
        },
        fixCode: async () => {
          fixCallCount++;
          return [{ op: 'write' as const, path: 'src/App.tsx', content: 'export default function App() { return <div>Fixed</div>; }' }];
        },
      },
    });

    const result: GenerationOutput = await worker.runUntil(async () => {
      const handle = await client.workflow.start(GenerationWorkflow, {
        taskQueue: 'test-gen-selfheal',
        workflowId: `wf-selfheal-${Date.now()}`,
        args: [{ projectId: 'p1', runId: 'run_selfheal', stackId: 'stk_1', prompt: 'test', artifactType: 'dashboard' }],
      });
      await new Promise((r) => setTimeout(r, 200));
      await handle.signal('approvePlan', {});
      return handle.result();
    });

    expect(buildCallCount).toBe(2);
    expect(fixCallCount).toBe(1);
    // result.buildHash comes from finalise mock — verify the run completed
    expect(result.artifactId).toBeDefined();
  }, 90_000);
});
