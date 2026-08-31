import * as wf from '@temporalio/workflow';
import type { GenerationActivities } from './shared/workflow-types.js';

export interface StackGenerationInput {
  runId: string;
  projectId: string;
  description: string;
  tableCount: number;
  rowCount: number;
}

const acts = wf.proxyActivities<Pick<GenerationActivities, 'generateStack'>>({
  startToCloseTimeout: '120s',
  retry: { maximumAttempts: 3, initialInterval: '2s', backoffCoefficient: 2 },
});

export async function StackGenerationWorkflow(input: StackGenerationInput): Promise<unknown> {
  const ctx = { runId: input.runId, projectId: input.projectId, stackId: '', workflowId: wf.workflowInfo().workflowId };
  return acts.generateStack({ ...ctx, description: input.description, tableCount: input.tableCount, rowCount: input.rowCount });
}
