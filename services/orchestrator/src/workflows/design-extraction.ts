import * as wf from '@temporalio/workflow';
import { cancelSignal } from './shared/signals.js';
import type { GenerationActivities } from './shared/workflow-types.js';

export interface DesignExtractionInput {
  runId: string;
  projectId: string;
  stackId: string;
  artifactUrl: string;
  workspaceId: string;
}

const acts = wf.proxyActivities<Pick<GenerationActivities, 'extractDesignTokens'>>({
  startToCloseTimeout: '300s',
  retry: { maximumAttempts: 3, initialInterval: '5s', backoffCoefficient: 2 },
});

export async function DesignExtractionWorkflow(input: DesignExtractionInput): Promise<unknown> {
  let cancelled = false;
  wf.setHandler(cancelSignal, () => { cancelled = true; });
  if (cancelled) return null;

  const ctx = { runId: input.runId, projectId: input.projectId, stackId: input.stackId, workflowId: wf.workflowInfo().workflowId };
  return acts.extractDesignTokens({ ...ctx, artifactUrl: input.artifactUrl, workspaceId: input.workspaceId });
}
