import * as wf from '@temporalio/workflow';
import { cancelSignal } from './shared/signals.js';
import type { GenerationActivities, FileOperation, BuildResult } from './shared/workflow-types.js';

export interface VisualEditInput {
  runId: string;
  projectId: string;
  stackId: string;
  artifactId: string;
  patch: { componentId: string; property: string; value: unknown };
  affectsLayout: boolean;
}

const acts = wf.proxyActivities<Pick<GenerationActivities, 'applyOperations' | 'buildArtifact' | 'verifyVisually' | 'finalise' | 'generateVisualPatch'>>({
  startToCloseTimeout: '60s',
  retry: { maximumAttempts: 3, initialInterval: '2s', backoffCoefficient: 2 },
});

export async function VisualEditWorkflow(input: VisualEditInput): Promise<void> {
  let cancelled = false;
  wf.setHandler(cancelSignal, () => { cancelled = true; });

  const ctx = { runId: input.runId, projectId: input.projectId, stackId: input.stackId, workflowId: wf.workflowInfo().workflowId };

  const fileOps: FileOperation[] = await acts.generateVisualPatch({ ...ctx, patch: input.patch, artifactId: input.artifactId });
  if (cancelled) return;

  const applied = await acts.applyOperations({ ...ctx, fileOps });
  const build: BuildResult = await acts.buildArtifact({ ...ctx, plan: null as never, appliedFiles: applied.paths });

  if (input.affectsLayout && build.success) {
    await acts.verifyVisually({ ...ctx, plan: null as never, screenshotUrl: build.screenshotUrl });
  }

  await acts.finalise({ ...ctx, plan: null as never, buildResult: build, verifyResult: undefined });
}
