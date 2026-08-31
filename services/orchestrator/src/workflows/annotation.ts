import * as wf from '@temporalio/workflow';
import { cancelSignal } from './shared/signals.js';
import type { GenerationActivities, FileOperation, BuildResult } from './shared/workflow-types.js';

export interface AnnotationInput {
  runId: string;
  projectId: string;
  stackId: string;
  artifactId: string;
  annotations: Array<{ componentId: string; comment: string; severity: 'critical' | 'minor' }>;
}

const acts = wf.proxyActivities<Pick<GenerationActivities, 'generateAnnotationPatches' | 'applyOperations' | 'buildArtifact' | 'verifyVisually' | 'finalise'>>({
  startToCloseTimeout: '120s',
  retry: { maximumAttempts: 3, initialInterval: '2s', backoffCoefficient: 2 },
});

export async function AnnotationWorkflow(input: AnnotationInput): Promise<void> {
  wf.setHandler(cancelSignal, () => { /* cancellation handled via heartbeat */ });

  const ctx = { runId: input.runId, projectId: input.projectId, stackId: input.stackId, workflowId: wf.workflowInfo().workflowId };

  const sorted = [...input.annotations].sort((a, b) =>
    a.severity === 'critical' ? -1 : b.severity === 'critical' ? 1 : 0
  );

  const fileOps: FileOperation[] = await acts.generateAnnotationPatches({ ...ctx, annotations: sorted, artifactId: input.artifactId });
  const applied = await acts.applyOperations({ ...ctx, fileOps });
  const build: BuildResult = await acts.buildArtifact({ ...ctx, plan: null as never, appliedFiles: applied.paths });

  if (build.success) {
    await acts.verifyVisually({ ...ctx, plan: null as never, screenshotUrl: build.screenshotUrl });
  }
  await acts.finalise({ ...ctx, plan: null as never, buildResult: build, verifyResult: undefined });
}
